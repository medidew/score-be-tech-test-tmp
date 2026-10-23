import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header>
      <nav aria-label="Main navigation">
        <Link to="/">Score</Link>
      </nav>
    </header>
  );
}
