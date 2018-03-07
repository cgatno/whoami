import * as React from "react"
import Helmet from "react-helmet"

export default () => (
  <div>
    <Helmet
      title="Christian Gaetano — JavaScript Developer and Seattle Dog Dad"
      meta={[
        {
          name: "description",
          content:
            "Biochemist turned software developer who's downright crazy about building for the web. Right now, I work with full stack JavaScript at GrapeCity, but I also spend lots of time working on open source projects, pretending to be a designer, and writing about life. Climb aboard to see what I'm up to and get in touch!",
        },
      ]}
    />
    <p>Page</p>
  </div>
)
