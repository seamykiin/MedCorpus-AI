import { Link } from "react-router";
import { Icon } from "./HomePage";

const landingFeatures = [
  {
    icon: "document" as const,
    title: "Tested levels",
    description: "Every finding, value, unit, and date is checked against the source.",
    slug: "tested-levels",
  },
  {
    icon: "sparkles" as const,
    title: "Clear summaries",
    description: "Dense medical language becomes a structured overview you can understand.",
    slug: "structured-summaries",
  },
  {
    icon: "warning" as const,
    title: "Honest uncertainty",
    description: "Missing or conflicting information is highlighted instead of guessed.",
    slug: "uncertainty-flags",
  },
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <nav className="landing-nav landing-shell" aria-label="Main navigation">
          <Link className="onboarding-brand" to="/">
            <span className="onboarding-brand-mark">
              <span />
              <span />
              <span />
            </span>
            MedCorpus
          </Link>
          <div className="landing-nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#safety">Safety</a>
          </div>
          <div className="landing-account-actions">
            <Link to="/login">Sign in</Link>
            <Link className="landing-nav-action" to="/signup">
              Create account
            </Link>
          </div>
        </nav>

        <div className="landing-hero-grid landing-shell">
          <div className="landing-copy">
            <span className="landing-kicker">
              <Icon name="sparkles" size={15} />
              A clearer way to read medical reports
            </span>
            <h1>
              Your health report,
              <br />
              <em>made understandable.</em>
            </h1>
            <p>
              MedCorpus turns lengthy medical reports into clear, structured summaries—with every
              fact connected to the original source.
            </p>
            <div className="landing-actions">
              <Link className="landing-primary-action" to="/start">
                Summarize your report <Icon name="arrow" size={18} />
              </Link>
              <a className="landing-secondary-action" href="#how-it-works">
                See how it works
              </a>
            </div>
            <div className="landing-trust">
              <span>
                <Icon name="shield" size={15} /> Private by design
              </span>
              <span>
                <Icon name="check" size={15} /> Source verified
              </span>
              <span>
                <Icon name="check" size={15} /> No signup required
              </span>
            </div>
          </div>

          <div className="landing-visual">
            <span className="landing-orbit orbit-wide" />
            <span className="landing-orbit orbit-tight" />
            <div className="landing-report">
              <div className="landing-report-top">
                <span className="report-mini-icon">
                  <Icon name="document" size={17} />
                </span>
                <span>
                  <strong>Blood test report</strong>
                  <small>4 pages · analyzed securely</small>
                </span>
                <i>
                  <Icon name="check" size={13} /> Verified
                </i>
              </div>
              <div className="landing-summary-title">
                <span>Report overview</span>
                <small>4 findings</small>
              </div>
              <div className="landing-finding">
                <span className="finding-letter">H</span>
                <span>
                  <strong>Hemoglobin</strong>
                  <small>13.8 g/dL · Within expected range</small>
                </span>
                <em>Page 2</em>
              </div>
              <div className="landing-finding">
                <span className="finding-letter amber">D</span>
                <span>
                  <strong>Vitamin D</strong>
                  <small>24 ng/mL · Below expected range</small>
                </span>
                <em>Page 3</em>
              </div>
              <div className="landing-plain-note">
                <Icon name="sparkles" size={18} />
                <span>
                  <strong>In plain language</strong>
                  Your Vitamin D level is slightly lower than recommended.
                </span>
              </div>
            </div>
            <div className="landing-float-card">
              <span>
                <Icon name="check" size={16} />
              </span>
              <p>
                <strong>Every fact is traceable</strong>
                Open the exact source passage anytime.
              </p>
            </div>
          </div>
        </div>

        <div className="landing-proof landing-shell">
          <p>Designed to support understanding—not replace medical care.</p>
          <span>
            <strong>100%</strong> source-linked facts
          </span>
          <span>
            <strong>6+</strong> supported languages
          </span>
          <span>
            <strong>&lt; 60s</strong> average summary
          </span>
        </div>
      </section>

      <section className="landing-process landing-shell" id="how-it-works">
        <div className="landing-section-heading">
          <span>Simple by design</span>
          <h2>Clarity in three careful steps</h2>
          <p>Upload your report, add optional context, and review every finding with its source.</p>
        </div>
        <div className="landing-step-grid">
          {[
            ["01", "Upload your report", "Choose a PDF or scanned medical report from your device."],
            ["02", "We verify the facts", "Important findings and values are checked against the document."],
            ["03", "Review with confidence", "Read a clear summary and open the source behind any fact."],
          ].map(([number, title, description]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-feature-section" id="features">
        <div className="landing-shell">
          <div className="landing-section-heading">
            <span>Evidence stays visible</span>
            <h2>More useful than a generic summary</h2>
            <p>Tools designed to keep important information clear, responsible, and verifiable.</p>
          </div>
          <div className="landing-feature-grid">
            {landingFeatures.map((feature) => (
              <Link key={feature.slug} to={`/features/${feature.slug}`}>
                <span className="landing-feature-icon">
                  <Icon name={feature.icon} size={21} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <small>
                  Explore feature <Icon name="arrow" size={15} />
                </small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-safety landing-shell" id="safety">
        <div className="safety-mark">
          <Icon name="shield" size={45} />
        </div>
        <div>
          <span className="landing-kicker">Care comes first</span>
          <h2>Built for clarity. Designed for trust.</h2>
          <p>
            Extracted facts remain separate from generated explanations, uncertainty is shown
            clearly, and the original report is always available for verification.
          </p>
        </div>
        <Link className="landing-primary-action light-action" to="/start">
          Start securely <Icon name="arrow" size={18} />
        </Link>
      </section>

      <footer className="landing-footer">
        <div className="landing-shell">
          <Link className="onboarding-brand" to="/">
            <span className="onboarding-brand-mark">
              <span />
              <span />
              <span />
            </span>
            MedCorpus
          </Link>
          <p>Medical reports, clearly summarized.</p>
          <span>Informational only · Not a medical diagnosis</span>
        </div>
      </footer>
    </main>
  );
}
