export default function TermsPage() {
  const h2 = { fontSize: 16, fontWeight: 700, color: "#1c1917", margin: "0 0 8px" } as const;
  const p = { margin: "0 0 12px" } as const;
  const ul = { paddingLeft: 20, margin: "0 0 12px" } as const;
  const li = { marginBottom: 4 } as const;

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 20px 60px" }}>
        <a href="/" style={{ color: "#f97316", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>← Back</a>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1c1917", margin: "24px 0 8px", letterSpacing: "-0.02em" }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: "#a8a29e", marginBottom: 32 }}>Last updated: 3 May 2026</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 28, fontSize: 14, color: "#44403c", lineHeight: 1.75 }}>

          <section>
            <p style={p}>These Terms of Service ("Terms") form a binding agreement between you and Kaan Taskent (operating as ContextDrop) regarding your use of the ContextDrop Telegram bot, website, and dashboard at contextdrop.ai (the "Service").</p>
            <p style={p}>By using the Service, you confirm that you have read, understood, and agreed to these Terms. If you do not agree, do not use the Service.</p>
            <p style={{ margin: 0 }}>Questions? Contact us at <a href="mailto:taskentbusiness@gmail.com" style={{ color: "#f97316", textDecoration: "none", fontWeight: 600 }}>taskentbusiness@gmail.com</a>.</p>
          </section>

          <section>
            <h2 style={h2}>1. Who can use the Service</h2>
            <p style={p}>You must be at least 16 years old to use ContextDrop. By using the Service, you represent and warrant that:</p>
            <ul style={ul}>
              <li style={li}>You are at least 16 years old</li>
              <li style={li}>You have the legal capacity to enter into these Terms</li>
              <li style={li}>You will use the Service in compliance with all applicable laws</li>
              <li style={li}>The information you provide to us is accurate</li>
            </ul>
          </section>

          <section>
            <h2 style={h2}>2. What ContextDrop does</h2>
            <p style={p}>ContextDrop is an AI-powered service that accepts links to social media videos, scrapes and analyses their content, and returns AI-generated verdicts stored in your personal dashboard. It optionally exports verdicts to your connected Notion workspace.</p>
            <p style={{ margin: 0 }}>The Service uses third-party AI providers (currently OpenAI and Anthropic). Verdicts are AI-generated and may contain errors or inaccuracies. <strong>You should not rely on Service outputs as the sole basis for any decision.</strong></p>
          </section>

          <section>
            <h2 style={h2}>3. Your account</h2>
            <p style={p}>To use the Service you must create an account using Sign in with Google. You are responsible for all activity that occurs under your account and for keeping your credentials secure. You may not share or transfer your account.</p>
          </section>

          <section>
            <h2 style={h2}>4. Acceptable use</h2>
            <p style={p}>You agree NOT to use the Service to:</p>
            <ul style={ul}>
              <li style={li}>Submit content that is illegal, infringing, defamatory, harassing, or threatening</li>
              <li style={li}>Submit content depicting child sexual abuse, non-consensual intimate imagery, or content sexualising minors</li>
              <li style={li}>Submit content that violates the intellectual property rights of others</li>
              <li style={li}>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
              <li style={li}>Scrape or programmatically access the Service except via official interfaces</li>
              <li style={li}>Submit malicious code or content designed to harm our infrastructure</li>
              <li style={li}>Bypass rate limits, credit systems, or any technical access controls</li>
              <li style={li}>Resell, sublicense, or rebrand the Service without written permission</li>
              <li style={li}>Use the Service to develop a competing AI product or train competing models</li>
              <li style={li}>Impersonate another person or misrepresent your affiliation</li>
            </ul>
            <p style={{ margin: 0 }}>We reserve the right to suspend or terminate accounts that violate these rules without notice.</p>
          </section>

          <section>
            <h2 style={h2}>5. Content and intellectual property</h2>
            <p style={p}><strong>Your content:</strong> You retain all rights to the content you submit. By submitting content, you grant us a limited licence to process, store, send to AI providers, and display it back to you. This licence ends when you delete the content or your account.</p>
            <p style={p}><strong>AI-generated outputs:</strong> We do not claim ownership of the verdicts produced by the Service. You own the verdicts associated with your account, subject to the rights of third-party AI providers under their own terms.</p>
            <p style={{ margin: 0 }}><strong>Our content:</strong> The Service itself, including the website design, code, branding, the ContextDrop name, and the ContextDrop logo, is owned by us. You may not copy, modify, distribute, or use any of it without our written permission.</p>
          </section>

          <section>
            <h2 style={h2}>6. Third-party content and platforms</h2>
            <p style={p}>The Service analyses content from third-party platforms (Instagram, TikTok, YouTube, X, and others). We do not own or control that content. You are responsible for ensuring your use of the Service complies with the terms of those platforms.</p>
            <p style={{ margin: 0 }}>We are not affiliated with, endorsed by, or sponsored by Instagram, TikTok, YouTube, X, Meta, ByteDance, Google, or any other social media platform.</p>
          </section>

          <section>
            <h2 style={h2}>7. AI outputs and reliability</h2>
            <p style={p}>The Service generates verdicts using artificial intelligence. AI outputs may contain errors, hallucinations, or factual inaccuracies. They should not be treated as professional advice (financial, legal, medical, or otherwise) and should not be used as the sole basis for decisions with significant consequences.</p>
            <p style={{ margin: 0 }}>Outputs are provided "as is" without warranty of accuracy or fitness for a particular purpose. You acknowledge that AI is an evolving technology and that we cannot guarantee any particular quality of output.</p>
          </section>

          <section>
            <h2 style={h2}>8. Payments and credits</h2>
            <p style={p}>The Service offers free and paid tiers. When paid features launch, pricing will be displayed at the point of purchase. Payments are processed by Stripe; we do not store your payment card details. Credits are non-transferable between accounts. Subscriptions renew automatically until cancelled.</p>
            <p style={p}><strong>Refund policy:</strong> You may request a full refund within 14 days of purchase by emailing <a href="mailto:taskentbusiness@gmail.com" style={{ color: "#f97316", textDecoration: "none" }}>taskentbusiness@gmail.com</a>. After 14 days, all sales are final, except where required by applicable consumer law.</p>
            <p style={{ margin: 0 }}>UK consumers retain their statutory rights, including those under the Consumer Rights Act 2015. We will notify you of material price changes before they take effect.</p>
          </section>

          <section>
            <h2 style={h2}>9. Service availability</h2>
            <p style={{ margin: 0 }}>We aim to keep the Service running reliably but do not guarantee uninterrupted availability. The Service is provided on an "as available" basis and may be temporarily unavailable for maintenance, affected by outages of third-party providers, or subject to changes, suspensions, or discontinuation at any time. We are not liable for losses caused by unavailability or downtime.</p>
          </section>

          <section>
            <h2 style={h2}>10. Termination</h2>
            <p style={p}><strong>By you:</strong> You may stop using the Service and delete your account at any time by emailing <a href="mailto:taskentbusiness@gmail.com" style={{ color: "#f97316", textDecoration: "none" }}>taskentbusiness@gmail.com</a> or using the in-app account deletion option (when available).</p>
            <p style={p}><strong>By us:</strong> We may suspend or terminate your access at any time, with or without notice, if we believe you have violated these Terms, if your use poses a risk to the Service or other users, or if required by law.</p>
            <p style={{ margin: 0 }}>On termination, your right to use the Service ends immediately and we will delete your personal data within 30 days, except where required to retain it. Sections that by their nature should survive termination (including limitation of liability, indemnification, and governing law) remain in effect.</p>
          </section>

          <section>
            <h2 style={h2}>11. Disclaimers</h2>
            <p style={p}>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.</p>
            <p style={{ margin: 0 }}>TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE, WARRANTIES OF NON-INFRINGEMENT, AND WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, ACCURATE, OR ERROR-FREE. You use the Service at your own risk.</p>
          </section>

          <section>
            <h2 style={h2}>12. Limitation of liability</h2>
            <p style={p}>TO THE FULLEST EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE IS LIMITED TO THE GREATER OF US $100 OR THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM.</p>
            <p style={p}>WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION.</p>
            <p style={{ margin: 0 }}>Nothing in these Terms limits liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any liability that cannot be limited under applicable law. UK consumers retain the full protection of UK consumer law.</p>
          </section>

          <section>
            <h2 style={h2}>13. Indemnification</h2>
            <p style={{ margin: 0 }}>You agree to indemnify and hold harmless Kaan Taskent (operating as ContextDrop) from any claims, damages, liabilities, costs, and expenses (including reasonable legal fees) arising out of your use of the Service, your violation of these Terms, your violation of any third party's rights, or content you submit to the Service.</p>
          </section>

          <section>
            <h2 style={h2}>14. Changes to these Terms</h2>
            <p style={{ margin: 0 }}>We may update these Terms from time to time. When we make material changes, we will update the "Last updated" date and notify you via email or in-app notification at least 14 days before the changes take effect. Continued use of the Service after changes take effect means you accept the new Terms.</p>
          </section>

          <section>
            <h2 style={h2}>15. Governing law and disputes</h2>
            <p style={p}>These Terms are governed by the laws of England and Wales. Any dispute arising out of or in connection with these Terms will be subject to the exclusive jurisdiction of the courts of England and Wales, except that UK consumers retain the right to bring proceedings in their local courts.</p>
            <p style={{ margin: 0 }}>Before bringing any legal action, please contact us at <a href="mailto:taskentbusiness@gmail.com" style={{ color: "#f97316", textDecoration: "none" }}>taskentbusiness@gmail.com</a> so we can try to resolve the issue informally.</p>
          </section>

          <section>
            <h2 style={h2}>16. Miscellaneous</h2>
            <p style={p}>These Terms, together with our Privacy Policy, are the entire agreement between you and us regarding the Service. If any part is found unenforceable, the remaining parts remain in effect. Our failure to enforce any right is not a waiver of that right. You may not assign your rights under these Terms. We may assign our rights to a successor in connection with a merger, acquisition, or sale of assets.</p>
            <p style={{ margin: 0 }}>We are not liable for any failure or delay caused by events beyond our reasonable control, including outages of third-party providers, internet failures, natural disasters, or government action.</p>
          </section>

          <section>
            <h2 style={h2}>17. Contact</h2>
            <p style={p}><strong>Email:</strong> <a href="mailto:taskentbusiness@gmail.com" style={{ color: "#f97316", textDecoration: "none" }}>taskentbusiness@gmail.com</a></p>
            <p style={p}><strong>Operator:</strong> Kaan Taskent (operating as ContextDrop)</p>
            <p style={{ margin: 0 }}><strong>Country:</strong> United Kingdom</p>
          </section>

          <p style={{ fontSize: 13, color: "#a8a29e", borderTop: "1px solid #e7e5e4", paddingTop: 24, margin: 0 }}>
            By using ContextDrop, you confirm you have read and agreed to these Terms.
          </p>

        </div>
      </div>
    </div>
  );
}
