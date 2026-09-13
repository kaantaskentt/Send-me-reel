#!/usr/bin/env python3
"""Build a private Share Sheet shortcut; never install, run, or upload it.

Action parameter names are checked against Cherri's built-in action declarations
(actions/basic.cherri, documents.cherri, web.cherri), parser.go's no-input
serialization, and Apple's bundled gallery WFTextTokenString serialization.
No third-party compiler or private Apple API is invoked.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import plistlib
import subprocess
import sys
import tempfile
import uuid


REPO = Path(__file__).resolve().parents[1]
OUTPUT_NAME = "Send-to-ContextDrop.shortcut"
INBOX_PARTS = ("Library", "Mobile Documents", "iCloud~is~workflow~my~workflows", "Documents", "ContextDrop", "Inbox")


def output_value(identifier: str, name: str) -> dict:
    return {"Type": "ActionOutput", "OutputUUID": identifier, "OutputName": name}


def attachment(value: dict) -> dict:
    return {"Value": value, "WFSerializationType": "WFTextTokenAttachment"}


def token_text(parts: list[str | dict]) -> dict:
    text = ""
    tokens = {}
    for part in parts:
        if isinstance(part, str):
            text += part
        else:
            offset = len(text.encode("utf-16-le")) // 2
            tokens[f"{{{offset}, 1}}"] = part
            text += "\ufffc"
    return {"Value": {"string": text, "attachmentsByRange": tokens}, "WFSerializationType": "WFTextTokenString"}


def build_workflow() -> dict:
    identifiers = [str(uuid.uuid4()).upper() for _ in range(6)]
    urls, first, plain, random_a, random_b, saved = identifiers

    def action(name: str, identifier: str, **parameters) -> dict:
        return {"WFWorkflowActionIdentifier": "is.workflow.actions." + name,
                "WFWorkflowActionParameters": {"UUID": identifier, **parameters}}

    actions = [
        action("detect.link", urls, WFInput=attachment({"Type": "ExtensionInput"})),
        action("getitemfromlist", first, WFInput=attachment(output_value(urls, "URLs")), WFItemSpecifier="First Item"),
        action("gettext", plain, WFTextActionText=token_text([output_value(first, "Item from List")])),
        action("number.random", random_a, WFRandomNumberMinimum=0, WFRandomNumberMaximum=2147483647),
        action("number.random", random_b, WFRandomNumberMinimum=0, WFRandomNumberMaximum=2147483647),
        action("documentpicker.save", saved, WFInput=attachment(output_value(plain, "Text")),
               WFAskWhereToSave=False, WFSaveFileOverwrite=False,
               WFFileDestinationPath=token_text(["ContextDrop/Inbox/link-", output_value(random_a, "Random Number"),
                                                 "-", output_value(random_b, "Random Number"), ".txt"])),
    ]
    return {
        "WFWorkflowClientVersion": "4018.0.4",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconStartColor": 463140863, "WFWorkflowIconGlyphNumber": 61592},
        "WFWorkflowTypes": ["ActionExtension"],
        "WFQuickActionSurfaces": [],
        "WFWorkflowInputContentItemClasses": ["WFURLContentItem", "WFStringContentItem", "WFSafariWebPageContentItem"],
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowHasOutputFallback": False,
        "WFWorkflowHasShortcutInputVariables": True,
        "WFWorkflowNoInputBehavior": {"Name": "WFWorkflowNoInputBehaviorShowError", "Parameters": {"Error": "Share a link to Send to ContextDrop from another app."}},
        "WFWorkflowImportQuestions": [],
        "WFWorkflowActions": actions,
    }


def verify_workflow(workflow: dict) -> None:
    actions = workflow["WFWorkflowActions"]
    expected = ["detect.link", "getitemfromlist", "gettext", "number.random", "number.random", "documentpicker.save"]
    if [a["WFWorkflowActionIdentifier"] for a in actions] != ["is.workflow.actions." + n for n in expected]:
        raise ValueError("Unexpected shortcut action")
    save = actions[-1]["WFWorkflowActionParameters"]
    if save["WFAskWhereToSave"] or save["WFSaveFileOverwrite"]:
        raise ValueError("Unexpected file-save behavior")
    destination = save["WFFileDestinationPath"]["Value"]["string"]
    if destination != "ContextDrop/Inbox/link-\ufffc-\ufffc.txt":
        raise ValueError("Unexpected inbox destination")
    if workflow["WFWorkflowNoInputBehavior"]["Name"] != "WFWorkflowNoInputBehaviorShowError":
        raise ValueError("Empty input must not read the clipboard")
    identifiers = {a["WFWorkflowActionParameters"]["UUID"] for a in actions}
    def walk(value):
        if isinstance(value, dict):
            if "OutputUUID" in value and value["OutputUUID"] not in identifiers:
                raise ValueError("Broken action-output reference")
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)
    walk(workflow)
    if plistlib.loads(plistlib.dumps(workflow)) != workflow:
        raise ValueError("Shortcut plist round trip failed")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate the generic recipe only; no files or signing")
    args = parser.parse_args()
    workflow = build_workflow()
    verify_workflow(workflow)
    if args.check:
        print("Shortcut recipe checks passed. Installation and iPhone execution are not tested by this check.")
        return 0
    if sys.platform != "darwin" or not Path("/usr/bin/shortcuts").is_file():
        print("Local signing requires macOS and Apple's Shortcuts command.", file=sys.stderr)
        return 1
    studio = REPO / ".contextdrop"
    output = studio / OUTPUT_NAME
    if studio.is_symlink() or output.exists() or output.is_symlink():
        print("The private output already exists or uses an unexpected path. Nothing was replaced.", file=sys.stderr)
        return 1
    icloud = Path.home().joinpath(*INBOX_PARTS[:4])
    if not icloud.is_dir() or not os.access(icloud, os.W_OK):
        print("Enable iCloud Drive for Shortcuts on this Mac before creating the phone shortcut.", file=sys.stderr)
        return 1
    studio.mkdir(mode=0o700, exist_ok=True)
    # Create only the task's dedicated inbox; never list or modify other iCloud files.
    inbox = Path.home().joinpath(*INBOX_PARTS)
    if (icloud / "ContextDrop").is_symlink() or inbox.is_symlink():
        print("The dedicated inbox uses an unexpected path. Nothing was signed.", file=sys.stderr)
        return 1
    inbox.mkdir(mode=0o700, parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="phone-shortcut-", dir=studio) as temporary:
        source = Path(temporary) / "Send to ContextDrop.shortcut"
        candidate = Path(temporary) / "signed.shortcut"
        source.write_bytes(plistlib.dumps(workflow, fmt=plistlib.FMT_XML))
        source.chmod(0o600)
        try:
            result = subprocess.run(["/usr/bin/shortcuts", "sign", "--mode", "people-who-know-me", "--input", str(source), "--output", str(candidate)],
                                    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45, check=False)
        except (subprocess.TimeoutExpired, OSError):
            print("Local signing was unavailable. No installable file was published; use the manual setup guide.", file=sys.stderr)
            return 1
        # Never print signing output: Apple may include the local signing identity.
        if result.returncode or not candidate.is_file() or not (100 < candidate.stat().st_size <= 1_000_000):
            print("Apple could not sign the personal shortcut. Check your Apple Account/Shortcuts setup or use the manual guide.", file=sys.stderr)
            return 1
        candidate.chmod(0o600)
        try:
            os.link(candidate, output)
        except FileExistsError:
            print("A private shortcut already exists. It was preserved.", file=sys.stderr)
            return 1
    print(f"Signed personal shortcut: {output}")
    print("Built and locally signed; not installed, run, or iPhone-tested. Keep this identity-bearing file private.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
