import * as React from "react"
import Helmet from "react-helmet"
import styled from "react-emotion"
import gray from "gray-percentage"
import ScrollPercentage from "react-scroll-percentage"

/* eslint-disable import/named */
import { rhythm, adjustFontSizeTo } from "../utils/typography"
/* eslint-enable import/named */
import colors from "../utils/colors"

const ResumeWrapper = styled("div")`
  max-width: 600px;
`

// Extra large header with name
const Name = styled("h1")`
  ${adjustFontSizeTo(`${18 * 3}px`)};
  font-weight: 700;
`

// Specialized horizontal list with contact info
const HorizontalList = styled("ul")`
  list-style: none;
  margin: 0;
  padding: 0;
  font-family: ${props =>
    props.sans ? `${["Lato", "sans-serif"].join(", ")};` : `inherit`};

  li {
    display: inline-block;
    padding: 0 10px;
    border-right: 1px solid ${gray(80)};
    color: ${gray(50)};

    @media screen and (max-width: 590px) {
      display: block;
      border: 0;
      padding: 0;
      ${adjustFontSizeTo("16px")};
    }

    &:first-child {
      padding-left: 0;
    }

    &:last-child {
      padding-right: 0;
      border-right: 0;
    }

    a {
      color: inherit;
      text-decoration: none;

      &:hover {
        color: ${colors.primaryColorLight};
      }
    }
  }
`

// Content sections and specific styling
const Section = styled("section")`
  margin-top: ${rhythm(2)};
`

const SubSection = styled("section")`
  margin-top: ${rhythm(1.5)};
`

const SectionHeader = styled("h3")`
  text-transform: uppercase;
  font-weight: 700;
`

const SubHeader = styled("span")`
  font-weight: 700;
  color: ${gray(50)};
  display: block;
  margin-bottom: ${rhythm(4 / 18)};
`

// Base positioning on overall scroll position to not go past footer
const PDFDownloadLink = styled("a")`
  ${adjustFontSizeTo("12px")};
  color: ${gray(70)};
  text-decoration: none;
  display: block;
  position: fixed;
  bottom: ${props => (props.stick ? "122px" : "10px")};
  right: calc((100% - 960px) / 2);
  transition-property: color;

  @media screen and (max-width: 990px) {
    position: relative;
    left: 0;
    top: 0;
    margin-bottom: ${rhythm(1)};
  }

  &:hover {
    color: ${gray(20)};
  }
`

export default () => (
  <ScrollPercentage>
    {percentage => (
      <ResumeWrapper>
        <PDFDownloadLink
          href="documents/resume.pdf"
          stick={percentage.toPrecision(2) >= 0.7}
          download
        >
          Download a PDF
        </PDFDownloadLink>
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
          <p>
            Driven and focused (and sometimes whimsical) JavaScript developer
            combining accredited biochemistry background with years of software
            development experience to deliver innovative, tested infrastructure
            solutions and engaging, delightful web experiences. Eager to
            collaborate with dedicated team members on cutting edge projects
            that push the boundaries of web technology to deliver novel
            products.
          </p>
        </Section>
        <Section>
          <SectionHeader>Professional Experience</SectionHeader>
          <SubSection>
            <SubHeader>GrapeCity, Inc.</SubHeader>
            <p>Full Stack Web Developer, Feb 2017 &ndash; Present</p>
            <ul>
              <li>
                Developed an Express.js-based Node.js app to power new
                production marketing website
              </li>
              <li>
                Devised MongoDB schema for session storage and user
                authentication, integrated with Express
              </li>
              <li>
                Planned and led implementation of new JavaScript code quality
                standards via source control strategy, code review, ESLint and
                Jest unit testing
              </li>
              <li>
                Created server-rendered UI layouts using Handlebars templating
                engine and SCSS
              </li>
              <li>
                Integrated novel DevOps workflows using Grunt task runner,
                Metalsmith, and Node.js infrastructure to facilitate quick
                development, deployment and content updates
              </li>
            </ul>
          </SubSection>
          <SubSection>
            <p>Technical Engagement Engineer, Oct 2016 &ndash; Feb 2017</p>
            <ul>
              <li>
                Created product samples for JavaScript UI control product line,
                Wijmo
              </li>
              <li>
                Inspected, updated and generated documentation and knowledge
                base articles for all product lines
              </li>
              <li>
                Wrote blog posts summarizing the latest JavaScript development
                trends
              </li>
              <li>
                Created innovative product demos to showcase product features
                and companion tutorial blogs
              </li>
            </ul>
          </SubSection>
        </Section>
        <Section>
          <SectionHeader>Education</SectionHeader>
          <SubSection>
            <SubHeader>Duquesne University</SubHeader>
            <p>B.S. Biochemistry, 2012 &ndash; 2016</p>
            <ul>
              <li>
                Hands-on, independent research and iterative project development
              </li>
              <li>Summa Cum Laude / Minors in Biology and Mathematics</li>
              <li>
                Undergraduate Honors Thesis on fragile X syndrome pathogenesis
              </li>
              <li>2016 Bayer School General Excellence Awardee</li>
            </ul>
          </SubSection>
        </Section>
      </ResumeWrapper>
    )}
  </ScrollPercentage>
)
