import * as React from "react"
import Helmet from "react-helmet"
import Button from "../components/button"

export default () => (
  <div>
    <Helmet>
      <meta name="robots" content="noindex" />
      <title>
        Christian Gaetano — JavaScript Developer and Seattle Dog Dad
      </title>
      <link rel="canonical" href="https://christiangaetano.com/privacy" />
      <meta
        name="description"
        content="WARNING: Spy satellites and Russian bots not welcome here! 🚫🛰 Check out my site's emphasis on privacy, and find out how to opt out of all analytics tracking."
      />
    </Helmet>
    <h1>It&apos;ll Be Like You Were Never Even Here...</h1>
    <p>
      With every company under the sun offering its own tracking platform and
      gating content with &ldquo;What&apos;s your favorite color?&rdquo;
      questions at every opportunity, I don&apos;t blame internet users for
      being concerned about privacy. Since this is a place to simply kick back,
      relax, and enjoy what the web has to offer, I work hard to make sure your
      privacy is respected.
    </p>
    <p>
      While I do use Google Analytics for collecting some basic visitor info, I
      don&apos;t take in any data that can uniquely identify you, and you can
      easily opt out if you want! On the other hand, if you <i>do</i> want to
      tell me your favorite color, the name of your dog (yes please), or just
      how you&apos;re feeling today, just{" "}
      <a href="mailto:hello@christiangaetano.com">shoot me an email</a>!
    </p>
    <h2>Analytics for &ldquo;Do Not Track&rdquo; Users</h2>
    <p>
      If you&apos;ve already enabled{" "}
      <a href="https://support.google.com/chrome/answer/2790761?co=GENIE.Platform%3DDesktop&hl=en">
        &ldquo;Do Not Track&rdquo; mode
      </a>{" "}
      in your web browser, you&apos;re covered! Err&hellip;not covered. The
      point is, I&apos;m not collecting <b>any</b> analytics data on you.
      You&apos;re a speck of dust in the wind, a ghost, an enigma&hellip;
    </p>
    <h2>Opting Out of Tracking</h2>
    <p>
      Even if you&apos;re not enough of a privacy guru to disable tracking{" "}
      <i>everywhere</i>, you can still{" "}
      <a href="javascript:gaOptout();">
        opt out of analytics tracking on my site only
      </a>. It&apos;s okay&hellip;I get it, I can be a little abrasive at times.
      No hard feelings, though! All you have to do is click the button below,
      and you&apos;ll be opted out faster than you can say{" "}
      <code>tinfoilHat.activate()</code>.
    </p>
    <Button role="button" href="javascript:gaOptout();">
      Opt Out of Analytics Tracking
    </Button>
  </div>
)
