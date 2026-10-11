import { Link } from "react-router";
import { Icon } from "./HomePage";

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div>
        <span>404</span>
        <h1>That page could not be found.</h1>
        <p>The report may have moved, but clarity is still one click away.</p>
        <Link className="primary-button" to="/">
          Return home <Icon name="arrow" />
        </Link>
      </div>
    </main>
  );
}
