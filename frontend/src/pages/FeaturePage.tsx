import { Link, Navigate, useParams } from "react-router";
import { Icon, type IconName } from "./HomePage";

type FeatureContent = {
  icon: IconName;
  eyebrow: string;
  title: string;
  intro: string;
  highlight: string;
  steps: Array<{ title: string; description: string }>;
  benefits: Array<{ title: string; description: string }>;
};

const featureContent: Record<string, FeatureContent> = {
  "uncertainty-flags": {
    icon: "warning",
    eyebrow: "Uncertainty & conflict flags",
    title: "Ambiguity is highlighted, never hidden.",
    intro:
      "MedCorpus identifies missing, unclear, or conflicting information and brings it to the user's attention rather than generating an unsupported answer.",
    highlight: "A careful “not enough information” is safer and more useful than a confident guess.",
    steps: [
      { title: "Compare findings", description: "Values, dates, and statements are checked for internal inconsistencies." },
      { title: "Assess confidence", description: "Missing context and weak source support are detected automatically." },
      { title: "Flag for review", description: "Clear labels show exactly what needs human verification." },
    ],
    benefits: [
      { title: "No silent guessing", description: "The system does not fill gaps with invented medical details." },
      { title: "Visible conflicts", description: "Contradictory values or dates are presented side by side." },
      { title: "Safer conversations", description: "Flags help users prepare focused questions for their care team." },
    ],
  },
  "mini-doctor-box": {
    icon: "sparkles",
    eyebrow: "Mini Doctor Box",
    title: "Practical wellness guidance, clearly separated from diagnosis.",
    intro:
      "Mini Doctor Box turns relevant report findings into general wellness suggestions covering routine, diet, and nutrition while keeping limitations visible.",
    highlight: "Suggestions are informational only and should always be reviewed with a qualified healthcare professional.",
    steps: [
      { title: "Review findings", description: "Verified report facts provide context for safe, general wellness guidance." },
      { title: "Generate suggestions", description: "The system offers practical ideas for routine, nutrition, and daily habits." },
      { title: "Label limitations", description: "Every suggestion is separated from medical facts and clearly marked as non-diagnostic." },
    ],
    benefits: [
      { title: "Actionable context", description: "General suggestions make a complex report feel easier to discuss and understand." },
      { title: "Clearly separated", description: "AI-generated guidance never appears as an extracted medical fact." },
      { title: "Responsible by design", description: "Prominent safety notes encourage users to consult their care team." },
    ],
  },
};

export default function FeaturePage() {
  const { featureId } = useParams();
  const feature = featureId ? featureContent[featureId] : undefined;

  if (!feature) return <Navigate to="/features/tested-levels" replace />;

  return (
    <main className="feature-page">
      <nav className="detail-nav page-shell" aria-label="Feature navigation">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>
            MedCorpus<span className="brand-dot">AI</span>
          </span>
        </Link>
        <Link className="back-link" to="/#features">
          <Icon name="arrow" size={17} />
          All features
        </Link>
      </nav>

      <header className="feature-hero">
        <div className="page-shell feature-hero-grid">
          <div className="feature-hero-copy">
            <span className="detail-eyebrow">{feature.eyebrow}</span>
            <h1>{feature.title}</h1>
            <p>{feature.intro}</p>
            <div className="feature-highlight">
              <Icon name="check" size={20} />
              {feature.highlight}
            </div>
          </div>
          <div className="feature-visual" aria-hidden="true">
            <span className="visual-orbit orbit-large" />
            <span className="visual-orbit orbit-small" />
            <span className="visual-icon">
              <Icon name={feature.icon} size={62} />
            </span>
            <span className="visual-chip chip-top">
              <Icon name="check" size={14} /> Source linked
            </span>
            <span className="visual-chip chip-bottom">
              <Icon name="shield" size={14} /> Verified
            </span>
          </div>
        </div>
      </header>

      <section className="detail-process section-shell">
        <div className="detail-section-heading">
          <span className="section-kicker">How it works</span>
          <h2>Built for clarity at every step</h2>
        </div>
        <div className="detail-steps">
          {feature.steps.map((step, index) => (
            <article key={step.title}>
              <span>0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-benefits">
        <div className="section-shell">
          <div className="detail-section-heading">
            <span className="section-kicker">Why it matters</span>
            <h2>Designed to support better understanding</h2>
          </div>
          <div className="benefit-grid">
            {feature.benefits.map((benefit) => (
              <article key={benefit.title}>
                <span>
                  <Icon name="check" size={18} />
                </span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-cta">
        <div className="section-shell">
          <Icon name={feature.icon} size={30} />
          <h2>See MedCorpus in action</h2>
          <p>Try the interactive report experience with a sample document.</p>
          <Link className="primary-button yellow-button" to="/start">
            Try a sample report <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </main>
  );
}
