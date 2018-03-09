import * as React from "react"
import Helmet from "react-helmet"
import styled from "react-emotion"
import gray from "gray-percentage"

import { rhythm, adjustFontSizeTo } from "../utils/typography"

const Name = styled("h1")`
  ${adjustFontSizeTo(`${18 * 3}px`)};
  font-weight: 700;
`

const HorizontalList = styled("ul")`
  list-style: none;
  margin: 0;
  padding: 0;
  ${props =>
    props.sans ? `font-family: ${["Lato", "sans-serif"].join(", ")};` : ``} li {
    display: inline-block;
    padding: 0 10px;
    border-right: 1px solid ${gray(80)};

    &:first-child {
      padding-left: 0;
    }

    &:last-child {
      padding-right: 0;
      border-right: 0;
    }
  }
`

const Section = styled("section")`
  margin-top: ${rhythm(2)};
`

const SectionHeader = styled("h3")`
  text-transform: uppercase;
  font-weight: 700;
`

export default () => (
  <div>
    <Helmet>
      <title>Christian Gaetano — Resume</title>
      <link rel="canonical" href="https://christiangaetano.com/resume" />
      <meta
        name="description"
        content="Biochemist turned software developer who's downright crazy about building for the web. Right now, I work with full stack JavaScript at GrapeCity, but I also spend lots of time working on open source projects, pretending to be a designer, and writing about life. Climb aboard to see what I'm up to and get in touch!"
      />
    </Helmet>
    <header>
      <Name>Christian Gaetano</Name>
      <h3>Full Stack Web Developer</h3>
      <HorizontalList sans>
        <li>Seattle, WA</li>
        <li>
          <a href="mailto:hello@christiangaetano.com?subject=Nice%20to%20meet%20you!%20👋">
            hello@christiangaetano.com
          </a>
        </li>
        <li>
          <a href="tel:+14129522373">412-952-2373</a>
        </li>
      </HorizontalList>
    </header>
    <Section>
      <SectionHeader>Summary</SectionHeader>
    </Section>
  </div>
)
