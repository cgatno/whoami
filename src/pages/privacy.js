import * as React from "react"
import Helmet from "react-helmet"

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
        content="Biochemist turned software developer who's downright crazy about building for the web. Right now, I work with full stack JavaScript at GrapeCity, but I also spend lots of time working on open source projects, pretending to be a designer, and writing about life. Climb aboard to see what I'm up to and get in touch!"
      />
    </Helmet>
    <h1>It&apos;ll Be Like You Were Never Even Here...</h1>
    <h2>Analytics for &ldquo;Do Not Track&rdquo; Users</h2>
  </div>
)
