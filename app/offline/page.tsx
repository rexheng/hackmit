import Link from "next/link";

export const metadata = {
  title: "COMPUTE WORKS — offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="works offline-desk">
      <header className="sign">
        <div className="gear" aria-hidden />
        <div className="wordmark">
          <h1>COMPUTE WORKS</h1>
          <p>the wire is down</p>
        </div>
        <div className="lot">
          <div className="rivets">
            <i className="rivet" />
            <i className="rivet" />
            <i className="rivet" />
          </div>
          <b>LOT 03-CW · OFFLINE STAMP</b>
          TIN LITHO · ELLIS COUNTY
          <br />
          THE DESK IS STILL HERE
        </div>
      </header>
      <div className="floor offline-floor">
        <main className="stage-wrap">
          <div className="stage-plate">CAM · NO FEED · HOLD THE CARD</div>
          <div className="await">
            <div className="plate">
              <h3>THE WIRE IS DOWN</h3>
              <p>
                This desk still opens from the tin you already stamped: the chassis, the punch-card
                language, the offline plate. Map tiles, live restamps, and mail need a network.
                When the feeder comes back, the works is where you left it.
              </p>
              <Link href="/" className="stamp-btn">
                TRY THE GATE AGAIN
              </Link>
            </div>
          </div>
        </main>
      </div>
      <footer className="belt">
        <div className="hint">
          OFFLINE FALLBACK
          <br />
          APP SHELL PRECACHED
          <br />
          POST /api NEVER CACHED
        </div>
        <div className="conveyor" />
      </footer>
    </div>
  );
}
