"use client";

import { motion } from "framer-motion";
import {
  Send,
  Brain,
  CheckCircle,
  ArrowRight,
  Bookmark,
  Clock,
  HelpCircle,
} from "lucide-react";

import { BOT_LINK } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

export default function LandingPage() {
  return (
    <div className="dark min-h-screen bg-[#0a0a0b] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-blue-400">Context</span>Drop
        </span>
        <a
          href={BOT_LINK}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Open in Telegram
        </a>
      </nav>

      {/* Hero */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="px-6 pt-20 pb-24 max-w-4xl mx-auto text-center"
      >
        <motion.h1
          variants={fadeUp}
          className="text-4xl md:text-6xl font-bold tracking-tight leading-tight"
        >
          Stop bookmarking.
          <br />
          <span className="text-blue-400">Start understanding.</span>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto"
        >
          Send any video link. Get a personalized AI verdict in 60 seconds.
          Know exactly what&apos;s inside and why it matters to you.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-10">
          <a
            href={BOT_LINK}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-4 rounded-full text-lg transition-colors"
          >
            Start free on Telegram
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="mt-3 text-sm text-zinc-500">
            10 free analyses. No signup required.
          </p>
        </motion.div>
      </motion.section>

      {/* Chat Mockup */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="px-6 pb-24 max-w-2xl mx-auto"
      >
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <div className="flex justify-end">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-sm text-sm max-w-xs">
              https://instagram.com/reel/DWHb7a7DJLZ
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-100 px-4 py-3 rounded-2xl rounded-bl-sm text-sm max-w-sm space-y-2">
              <p className="font-semibold text-blue-400">
                MiroFish — Multi-agent AI prediction swarm
              </p>
              <p className="text-zinc-300 text-xs leading-relaxed">
                A network of AI agents that collaborate to predict outcomes
                using Bayesian belief networks. Upload data, configure roles,
                get probabilistic forecasts.
              </p>
              <div className="flex gap-2 pt-1">
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                  Learn
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  Apply
                </span>
                <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                  Skip
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Problem */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
        className="px-6 py-24 max-w-4xl mx-auto"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl md:text-4xl font-bold text-center"
        >
          Bookmarks are where content
          <br />
          <span className="text-zinc-500">goes to die</span>
        </motion.h2>
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Bookmark,
              text: "You save 10 videos a day. You review zero.",
            },
            {
              icon: HelpCircle,
              text: "You know there was a tool in that reel... but which one?",
            },
            {
              icon: Clock,
              text: "You promise yourself you'll go back. You never do.",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="text-center space-y-4"
            >
              <item.icon className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-zinc-300">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* How it works */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
        className="px-6 py-24 max-w-4xl mx-auto"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl md:text-4xl font-bold text-center mb-16"
        >
          How it works
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-12">
          {[
            {
              icon: Send,
              step: "01",
              title: "Send",
              desc: "Paste any Instagram, TikTok, or X link into the Telegram bot.",
            },
            {
              icon: Brain,
              step: "02",
              title: "Analyze",
              desc: "AI watches, listens, reads, and extracts everything — tools, links, concepts.",
            },
            {
              icon: CheckCircle,
              step: "03",
              title: "Decide",
              desc: "Get your personalized verdict: Learn it, Apply it, or Skip it.",
            },
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-7 h-7 text-blue-400" />
              </div>
              <p className="text-xs text-zinc-500 font-mono mb-2">
                {item.step}
              </p>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-zinc-400 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Example verdict */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="px-6 py-24 max-w-3xl mx-auto"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          What you get back
        </h2>
        <p className="text-zinc-400 text-center mb-12">
          Every verdict is tailored to YOUR goals.
        </p>
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-3 text-sm">
          <p>
            <span className="text-blue-400 font-semibold">
              AI Scaling Paradigm Shift
            </span>{" "}
            <span className="text-zinc-500">
              — Industry pivot from bigger models to smarter architectures
            </span>
          </p>
          <p className="text-zinc-300">
            Ilya Sutskever argues that just making AI models bigger won&apos;t
            solve everything anymore — the field needs innovative designs and
            reasoning methods.
          </p>
          <p className="text-zinc-400">
            Future breakthroughs will come from creative approaches, memory
            systems, and novel architectures rather than more GPUs.
          </p>
          <p className="text-zinc-500 text-xs">
            Real-world use: Researchers developing new ways for AI to remember
            context or reason through problems step-by-step.
          </p>
          <div className="flex gap-2 pt-2">
            <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-medium">
              Learn
            </span>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-medium">
              Apply
            </span>
            <span className="text-xs bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full font-medium">
              Skip
            </span>
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Your first 10 analyses are free.
        </h2>
        <p className="text-zinc-400 mb-10">
          No credit card. No signup form. Just open Telegram.
        </p>
        <a
          href={BOT_LINK}
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-4 rounded-full text-lg transition-colors"
        >
          Open in Telegram
          <ArrowRight className="w-5 h-5" />
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-zinc-500">
          <span>
            <span className="text-blue-400">Context</span>Drop
          </span>
          <span>Send it. Understand it. Actually use it.</span>
        </div>
      </footer>
    </div>
  );
}
