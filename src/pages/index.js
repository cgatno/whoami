import * as React from "react"
import Helmet from "react-helmet"
import styled from "react-emotion"
import Link from "gatsby-link"

const IndexWrapper = styled("div")`
  max-width: 600px;
  margin: 0 auto;
`

export default () => (
  <IndexWrapper>
    <Helmet>
      <title>
        Christian Gaetano — JavaScript Developer and Seattle Dog Dad
      </title>
      <link rel="canonical" href="https://christiangaetano.com" />
      <meta
        name="description"
        content="Biochemist turned software developer who's downright crazy about building for the web. Right now, I work with full stack JavaScript at GrapeCity, but I also spend lots of time working on open source projects, pretending to be a designer, and writing about life. Climb aboard to see what I'm up to and get in touch!"
      />
    </Helmet>
    <h1 style={{ fontFamily: ["Lora", "serif"].join(", ") }}>
      <i>Hello,</i>
    </h1>
    <p>
      My name&apos;s Christian Gaetano. I&apos;m a software engineer with a
      passion for building delightful &amp; meaningful experiences on the web.
      And even though it&apos;s not my day job, I love helping to design those
      experiences when I can.
    </p>
    <p>
      Since you&apos;ve managed to find my personal website, I&apos;m willing to
      bet you&apos;re on a mission to uncover all of my deepest, darkest
      secrets. Really though, you&apos;re probably looking for something
      specific. If that&apos;s the case, feel free to head straight to my{" "}
      <Link to="/resume">resume</Link> or peruse my{" "}
      <Link to="/work">portfolio</Link>.
    </p>
    <p>
      Of course &mdash; if you&apos;re just here for a good time* &mdash;{" "}
      <i>please</i>, read on! You can check out a list of my latest writings
      below. If you&apos;re feeling really adventurous, you can read more about
      my ever changing story.
    </p>
    <p>
      <small>
        * <i>You&apos;ve come to the right place</i>.
      </small>
    </p>
  </IndexWrapper>
)
