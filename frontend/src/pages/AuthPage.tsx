import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Icon } from "./HomePage";

type AuthMode = "login" | "signup" | "forgot";

const authCopy = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to your health workspace",
    description: "Access your saved summaries and continue reviewing reports securely.",
    submit: "Sign in",
  },
  signup: {
    eyebrow: "Create your account",
    title: "A clearer health record starts here",
    description: "Keep your report summaries organized, private, and available when you need them.",
    submit: "Create account",
  },
  forgot: {
    eyebrow: "Password recovery",
    title: "Reset your password",
    description: "Enter your email and we’ll send you a secure link to regain access.",
    submit: "Send reset link",
  },
};

function AuthPage({ mode }: { mode: AuthMode }) {
  const copy = authCopy[mode];
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const acceptedTerms = form.get("terms") === "on";

    if (!email.includes("@")) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (mode === "signup" && name.length < 2) {
      setFormError("Enter your full name.");
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      setFormError("Your password must contain at least 8 characters.");
      return;
    }
    if (mode === "signup" && !acceptedTerms) {
      setFormError("Please accept the terms to create an account.");
      return;
    }

    setFormError("");
    setSubmitted(true);
  };

  return (
    <main className="auth-page">
      <section className="auth-workspace">
        <div className="auth-inner">
          <header className="auth-header">
            <Link className="onboarding-brand" to="/">
              <span className="onboarding-brand-mark">
                <span />
                <span />
                <span />
              </span>
              MedCorpus
            </Link>
            <Link className="auth-close" to="/" aria-label="Return home">
              <Icon name="x" size={18} />
            </Link>
          </header>

          <div className="auth-form-wrap">
            {!submitted ? (
              <>
                <span className="auth-symbol">
                  <Icon name={mode === "forgot" ? "shield" : "document"} size={22} />
                </span>
                <span className="auth-eyebrow">{copy.eyebrow}</span>
                <h1>{copy.title}</h1>
                <p>{copy.description}</p>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                  {mode === "signup" && (
                    <label>
                      <span>Full name</span>
                      <input
                        autoComplete="name"
                        name="name"
                        placeholder="Your full name"
                        type="text"
                      />
                    </label>
                  )}

                  <label>
                    <span>Email address</span>
                    <input
                      autoComplete="email"
                      name="email"
                      placeholder="you@example.com"
                      type="email"
                    />
                  </label>

                  {mode !== "forgot" && (
                    <label>
                      <span className="password-label">
                        Password
                        {mode === "login" && <Link to="/forgot-password">Forgot password?</Link>}
                      </span>
                      <span className="password-field">
                        <input
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
                          name="password"
                          placeholder="At least 8 characters"
                          type={showPassword ? "text" : "password"}
                        />
                        <button
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowPassword((current) => !current)}
                          type="button"
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </span>
                    </label>
                  )}

                  {mode === "signup" && (
                    <label className="auth-consent">
                      <input name="terms" required type="checkbox" />
                      <span>
                        I agree to the Terms and understand MedCorpus provides informational
                        summaries, not medical diagnoses.
                      </span>
                    </label>
                  )}

                  {formError && (
                    <div className="auth-error" role="alert">
                      <Icon name="warning" size={15} />
                      {formError}
                    </div>
                  )}

                  <button className="auth-submit" type="submit">
                    {copy.submit}
                    <Icon name="arrow" size={17} />
                  </button>
                </form>

                {mode !== "forgot" && (
                  <>
                    <div className="auth-divider">
                      <span>or continue with</span>
                    </div>
                    <button className="auth-social" type="button">
                      <span>G</span>
                      Continue with Google
                    </button>
                  </>
                )}

                <div className="auth-switch">
                  {mode === "login" && (
                    <>
                      New to MedCorpus? <Link to="/signup">Create an account</Link>
                    </>
                  )}
                  {mode === "signup" && (
                    <>
                      Already have an account? <Link to="/login">Sign in</Link>
                    </>
                  )}
                  {mode === "forgot" && (
                    <>
                      Remembered your password? <Link to="/login">Return to sign in</Link>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="auth-success" aria-live="polite">
                <span>
                  <Icon name="check" size={25} />
                </span>
                <h1>{mode === "forgot" ? "Check your inbox" : "You’re all set"}</h1>
                <p>
                  {mode === "forgot"
                    ? "If an account exists for that email, a secure password reset link is on its way."
                    : mode === "signup"
                      ? "Your frontend account setup is complete. Continue to your report workspace."
                      : "You’ve signed in successfully. Continue to your report workspace."}
                </p>
                <Link className="auth-submit" to="/start">
                  Continue to MedCorpus <Icon name="arrow" size={17} />
                </Link>
              </div>
            )}
          </div>

          <footer className="auth-workspace-footer">
            <span>Encrypted and private</span>
            <span>Informational use only</span>
          </footer>
        </div>
      </section>

      <aside className="auth-aside">
        <span className="auth-orbit orbit-one-auth" />
        <span className="auth-orbit orbit-two-auth" />
        <div className="auth-aside-content">
          <span className="auth-aside-icon">
            <Icon name="shield" size={35} />
          </span>
          <blockquote>
            “Understanding a report should never mean losing sight of where the information came
            from.”
          </blockquote>
          <p>Every extracted fact stays connected to its original source.</p>
        </div>
        <div className="auth-assurance">
          <span>Designed for trust</span>
          <p>
            <Icon name="check" size={15} /> Source-linked summaries
          </p>
          <p>
            <Icon name="check" size={15} /> Clear uncertainty labels
          </p>
          <p>
            <Icon name="check" size={15} /> Private report handling
          </p>
        </div>
      </aside>
    </main>
  );
}

export function LoginPage() {
  return <AuthPage mode="login" />;
}

export function SignupPage() {
  return <AuthPage mode="signup" />;
}

export function ForgotPasswordPage() {
  return <AuthPage mode="forgot" />;
}
