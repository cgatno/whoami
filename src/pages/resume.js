import * as React from "react"
import Helmet from "react-helmet"
import styled from "react-emotion"
import gray from "gray-percentage"
import Observer from "react-intersection-observer"

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

// Specialized list for skills (mid dot delimeter)
const DotList = styled("ul")`
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    display: inline-block;

    &::after {
      content: "\\00b7";
      display: inline-block;
      margin: 0 5px;
    }

    &:last-child::after {
      content: "";
    }
  }
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
  position: ${props => (props.stick ? "absolute" : "fixed")};
  bottom: ${props => (props.stick ? `calc(-${rhythm(2)} + 10px)` : "10px")};
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

const ScrollObserver = styled("div")`
  position: absolute;
  width: 100%;
  bottom: -${rhythm(2)};
  left: 0;
  display: block;
`

export default class Resume extends React.Component {
  constructor(props) {
    super(props)

    // Track whether footer has been reached
    this.state = {
      footerInView: false,
    }
  }

  render() {
    return (
      <ResumeWrapper>
        <PDFDownloadLink
          href="/documents/Christian%20Gaetano%20Full%20Stack%20Web%20Developer.pdf"
          stick={this.state.footerInView}
          download
        >
          Download a PDF
        </PDFDownloadLink>
        <Helmet>
          <title>Christian Gaetano — Full Stack Web Developer — Resume</title>
          <link rel="canonical" href="https://christiangaetano.com/resume/" />
          <meta
            name="description"
            content="For you professional types, check out a listing of my work experiences and education online. If you're stretched for time, you can download a PDF, too!"
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
            Biochemist turned software engineer with multiple years of
            experience in back-end and front-end application development,
            JavaScript programming best practices, and marketable technical
            writing. Eager to transition to a challenging Front-End or Full
            Stack Engineering role within a team looking to innovate creative
            solutions at a large scale.
          </p>
        </Section>
        <Section>
          <SectionHeader>Employment</SectionHeader>
          <SubSection>
            <SubHeader>GrapeCity, Inc.</SubHeader>
            <p>Full Stack Web Developer, Feb 2017 &ndash; Present</p>
            <ul>
              <li>
                Designed and built Node.js powered static site generator based
                on Metalsmith platform
              </li>
              <li>
                Worked with back-end engineering team to implement user
                authentication and account management powered by MongoDB and
                Express.js
              </li>
              <li>
                Developed content search and account management applications
                using React and related technologies (CSS-in-JS, Flow, Babel)
              </li>
              <li>
                Led team-wide code quality initiatives: systematic code review,
                standardized linting, Gitflow Workflow
              </li>
              <li>
                Participated in brand style guide development and front-end UI
                implementation based on design mockups
              </li>
              <li>
                Planned and authored Modern JavaScript Frameworks e-book with
                hundreds of daily downloads
              </li>
            </ul>
          </SubSection>
          <SubSection>
            <p>Technical Engagement Engineer, Oct 2016 &ndash; Feb 2017</p>
            <ul>
              <li>
                Provided low-level technical support and strategic consultation
                to corporate customers using Wijmo JavaScript UI Framework
              </li>
              <li>
                Authored several technical blog posts with thousands of monthly
                user impressions
              </li>
              <li>
                Developed product demos using plain JavaScript, React, Angular,
                and Vue
              </li>
              <li>
                Bridged communication between Wijmo product team and developer
                community, including bug report and feature request logging
              </li>
            </ul>
          </SubSection>
          <SubSection>
            <SubHeader>
              National Science Foundation REU Leadership Group
            </SubHeader>
            <p>
              Design and Web Development Consultant, Jan 2016 &ndash; Feb 2018
            </p>
            <ul>
              <li>
                Designed and produced new brand assets and strategy in
                collaboration with group members
              </li>
              <li>
                Migrated existing copy to new website with updated branding,
                responsive layout, and analytics tracking
              </li>
              <li>
                Optimized content for search visibility and target audience,
                increasing session duration by 400% and decreasing bounce rate
                by 20% over three months
              </li>
            </ul>
          </SubSection>
        </Section>
        <Section>
          <SectionHeader>For Fun</SectionHeader>
          <SubSection>
            <SubHeader>CodePen PGH</SubHeader>
            <p>Meetup Co-organizer</p>
            <ul>
              <li>Helped plan meetup topics and themes</li>
              <li>Coordinated venue procurement &amp; snack delivery</li>
              <li>
                Promoted attendee &ldquo;pens&rdquo; to CodePen for featured
                recognition.
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
                Graduated Summa Cum Laude, chosen as Bayer School General
                Excellence Awardee
              </li>
              <li>
                Defended honors thesis on role of G-quadruplex RNA structures in
                fragile X syndrome pathogenesis
              </li>
              <li>Minor degree in mathematics</li>
            </ul>
          </SubSection>
        </Section>
        <Section>
          <SectionHeader>Skills</SectionHeader>
          <SubSection>
            <DotList>
              <li>Node.js & NPM</li>
              <li>React</li>
              <li>Angular</li>
              <li>Babel</li>
              <li>Git</li>
              <li>Technical Writing</li>
              <li>RESTful Architecture</li>
              <li>GraphQL</li>
              <li>Static Sites</li>
              <li>SEO</li>
              <li>MongoDB</li>
              <li>MySQL</li>
            </DotList>
          </SubSection>
        </Section>
        <Section>
          <SectionHeader>Programming Languages</SectionHeader>
          <SubSection>
            <DotList>
              <li>JavaScript & TypeScript (fluent)</li>
              <li>C# (proficient)</li>
              <li>PHP (proficient)</li>
              <li>C++ (prior experience)</li>
            </DotList>
          </SubSection>
        </Section>
        <ScrollObserver>
          <Observer
            onChange={footerInView =>
              this.setState({
                footerInView,
              })
            }
          />
        </ScrollObserver>
      </ResumeWrapper>
    )
  }
}
