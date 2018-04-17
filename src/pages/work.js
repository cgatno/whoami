import * as React from "react"
import Helmet from "react-helmet"
import styled from "react-emotion"

import PortfolioItem from "../components/portfolio-item"
/* eslint-disable import/named */
import { rhythm } from "../utils/typography"
/* eslint-enable import/named */

// Import portfolio imagery
import NSFWebp from "../images/portfolio/chemnsfreu.webp"
import NSFPng from "../images/portfolio/chemnsfreu.png"

import ebookWebp from "../images/portfolio/ebook.webp"
import ebookJpg from "../images/portfolio/ebook.jpg"

import melediaWebp from "../images/portfolio/meledia.webp"
import melediaPng from "../images/portfolio/meledia.png"

import rtPattersonWebp from "../images/portfolio/rt-patterson.webp"
import rtPattersonGif from "../images/portfolio/rt-patterson.gif"

import tuplesWebp from "../images/portfolio/tuples.webp"
import tuplesPng from "../images/portfolio/tuples.png"

import grapecityWebinarsWebp from "../images/portfolio/grapecity-webinars.webp"
import grapecityWebinarsPng from "../images/portfolio/grapecity-webinars.png"

const PortfolioGrid = styled("div")`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  grid-gap: ${rhythm(2)} ${rhythm(1.5)};

  @media screen and (max-width: 505px) {
    grid-template-columns: repeat(auto-fill, minmax(0, 100%));
    grid-gap: ${rhythm(1)} 0;
  }
`

export default class Work extends React.Component {
  render() {
    return (
      <PortfolioGrid>
        <Helmet>
          <title>Christian Gaetano — Portfolio & Recent Work</title>
          <link rel="canonical" href="https://christiangaetano.com/work" />
          <meta
            name="description"
            content="I try to keep busy with side projects and open source work, but sometimes it gets hard to keep track of where I've been and where I'm going next! Check out an illustrated portfolio of some of my more recent endeavors along with older ones that still look surprisingly nice and shiny."
          />
        </Helmet>
        {/* GC Webinars */}
        <a
          href="https://www.grapecity.com/en/webinars"
          target="_cgatno_portfolio_view"
        >
          <PortfolioItem
            images={[
              { src: grapecityWebinarsWebp, type: "image/webp" },
              { src: grapecityWebinarsPng, type: "image/png" },
              {
                src: grapecityWebinarsPng,
                isFallback: true,
                alt:
                  "One of my most recent projects at GrapeCity was designing and implementing a new Webinars explorer.",
              },
            ]}
          />
        </a>
        <PortfolioItem>
          <h2>GrapeCity Webinars Redesign</h2>
          <p>
            This one was for my day job, but that didn&apos;t detract from the
            intrigue at all! I was given the lead on revamping our webinars
            page, so I opened up Sketch and mocked away. A few iterations later,
            we landed on a design we liked, and the team and I planned out
            implementation with our static site generator.
          </p>
          <p style={{ margin: 0 }}>
            This was one of the first projects where I headed up design, and I
            learned <i>a lot</i> in the process. Using Sketch symbols in the
            original design made it easy to iterate, and laying out copy ahead
            of time made the implementation go much more quickly.
          </p>
        </PortfolioItem>
        {/* NSF LG */}
        <a href="https://chemnsfreu.com" target="_cgatno_portfolio_view">
          <PortfolioItem
            images={[
              { src: NSFWebp, type: "image/webp" },
              { src: NSFPng, type: "image/png" },
              {
                src: NSFPng,
                isFallback: true,
                alt:
                  "The NSF REU Leadership Group website takes advantage of gradients and imagery to draw in users.",
              },
            ]}
          />
        </a>
        <PortfolioItem>
          <h2>NSF REU Leadership Group</h2>
          <p>
            I spent a few years working with the National Science
            Foundation&apos;s REU Leadership Group to develop a web presence and
            branding that appeal to chemistry students and faculty from around
            the country.
          </p>
          <p style={{ margin: 0 }}>
            We worked together to develop a brand new website that group members
            could easily edit and reconfigure. We also delved into a few SEO
            deep dives to continuously optimize the site for the relatively
            small but very targeted audience.
          </p>
        </PortfolioItem>
        {/* Frameworks Ebook */}
        <a
          href="https://www.grapecity.com/en/ebook"
          target="_cgatno_portfolio_view"
        >
          <PortfolioItem
            images={[
              { src: ebookWebp, type: "image/webp" },
              { src: ebookJpg, type: "image/jpg" },
              { src: ebookJpg, isFallback: true, alt: "" },
            ]}
          />
        </a>
        <PortfolioItem>
          <h2>JavaScript Frameworks E-book</h2>
          <p style={{ margin: 0 }}>
            For a month or so, I put a &ldquo;pause&rdquo; on development of new
            projects (we all know they never <i>really</i> stop) and caffeinated
            myself to the point of no return as I dug into the technical details
            of the most popular front-end JavaScript frameworks. This e-book is
            the culmination of that research, plus a good bit of (not
            necessarily company-condoned) insomniac writing.
          </p>
        </PortfolioItem>
        {/* Tuples blog */}
        <a
          href="https://www.grapecity.com/en/blogs/tackling-tuples-understanding-the-new-c-7-value-type"
          target="_cgatno_portfolio_view"
        >
          <PortfolioItem
            images={[
              { src: tuplesWebp, type: "image/webp" },
              { src: tuplesPng, type: "image/png" },
              { src: tuplesPng, isFallback: true, alt: "" },
            ]}
          />
        </a>
        <PortfolioItem>
          <h2>Tackling Tuples in C#</h2>
          <p style={{ margin: 0 }}>
            A quick blog post I threw together in the weeks leading up to the
            release of C# 7. Even though tuples had been around in the language
            for awhile, they were pretty unwieldy and a little uncommon. Since
            the 7.0 updates were promising to change <i>everything</i>, I
            decided to look into how the new tuple value type might make these
            structures easier to use in C#.
          </p>
        </PortfolioItem>
        {/* RT Patterson */}
        <a href="http://rtpatterson.com" target="_cgatno_portfolio_view">
          <PortfolioItem
            images={[
              { src: rtPattersonWebp, type: "image/webp" },
              { src: rtPattersonGif, type: "image/gif" },
              {
                src: rtPattersonGif,
                isFallback: true,
                alt:
                  "One of the first freelance projects I worked on, the R.T. Patterson site features lots of colorful branding with a navigation menu that slides on touch.",
              },
            ]}
          />
        </a>
        <PortfolioItem>
          <h2>RT Patterson</h2>
          <p>
            One of the first professional, business grade websites I ever worked
            on, the R.T. Patterson project is one I&apos;ll never forget. A
            college friend and I had just started working together as a
            freelance team, and we were extremely excited to land such a well
            known client who was equally excited to work with us.
          </p>
          <p style={{ margin: 0 }}>
            It was a lot of fun to develop requirements and iterate on designs,
            plus we got to build a sweet mobile navigation menu that is plan{" "}
            <i>smooth</i> on touch devices. (Which wasn&apos;t so easy at the
            time!)
          </p>
        </PortfolioItem>
        {/* Meledia */}
        <a href="https://meledia.com" target="_cgatno_portfolio_view">
          <PortfolioItem
            images={[
              { src: melediaWebp, type: "image/webp" },
              { src: melediaPng, type: "image/png" },
              {
                src: melediaPng,
                isFallback: true,
                alt:
                  "The Meledia website is minimalist on purpose, putting an emphasis on our passion for using creativity to send concise, targeted messages.",
              },
            ]}
          />
        </a>
        <PortfolioItem>
          <h2>Meledia</h2>
          <p>
            As we started to take on more clients and found ourselves happily
            devoting tons of time to web design projects, my friend and I
            decided to make our business official. (Well, the government sort of
            decided for us with taxes and whatnot. But we already wanted to make
            it official anyways!)
          </p>
          <p style={{ margin: 0 }}>
            Since then, our website has gone through more than its fair share of
            redesigns and technology changes, and the current version is one of
            the simplest yet. We spent a couple of weeks designing and building
            out this minimalist, fast-loading layout. It&apos;s lightweight and
            uses cloud functions to send mail, which is perfect for our current
            status. We&apos;ve been winding down operations as we both pursue
            some other goals in our lives, but we&apos;re always more than happy
            to talk about design with anyone!
          </p>
        </PortfolioItem>
      </PortfolioGrid>
    )
  }
}
