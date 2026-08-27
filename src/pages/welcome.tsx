import Head from "next/head";
import Image from "next/image";
import { AppLink } from "@/components/AppLink";
import { assetPath } from "@/lib/asset-path";

export const WELCOME_SEEN_KEY = "noklingo:welcome-seen:v1";

export default function WelcomePage() {
  const markWelcomeSeen = () => {
    try {
      window.localStorage.setItem(WELCOME_SEEN_KEY, "true");
    } catch {
      // Navigation still succeeds when storage is unavailable.
    }
  };

  return (
    <>
      <Head>
        <title>Welcome to NokLingo</title>
        <meta name="description" content="Learn Thai through real conversations." />
      </Head>
      <section className="welcome-page" aria-labelledby="welcome-title">
        <div className="welcome-brand">
          <Image
            className="welcome-mark"
            src={assetPath("/icon.svg")}
            width={144}
            height={144}
            alt="NokLingo black bird"
            priority
          />
          <h1 id="welcome-title">NokLingo</h1>
          <p>Learn Thai through<br />real conversations.</p>
        </div>
        <AppLink className="welcome-primary-button" href="/today/" onClick={markWelcomeSeen}>
          Get Started
        </AppLink>
      </section>
    </>
  );
}
