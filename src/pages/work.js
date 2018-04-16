import * as React from "react"
import Helmet from "react-helmet"
import styled from "react-emotion"

import PortfolioItem from "../components/portfolio-item"

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

const PortfolioContainer = styled("div")`
  perspective: 1000px;
  display: block;
  position: relative;
`

const PortfolioGrid = styled("div")`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  grid-gap: 20px 0;
`

export default class Work extends React.Component {
  render() {
    return (
      <PortfolioContainer>
        <Helmet>
          <title>Christian Gaetano — Full Stack Web Engineer — Resume</title>
          <link rel="canonical" href="https://christiangaetano.com/work" />
          <meta
            name="description"
            content="I try to keep busy with side projects and open source work, but sometimes it gets hard to keep track of where I've been and where I'm going next! Check out an illustrated portfolio of some of my more recent endeavors along with older ones that still look surprisingly nice and shiny."
          />
        </Helmet>
        <PortfolioGrid>
          {/* GC Webinars */}
          <a
            href="https://www.grapecity.com/en/webinars"
            target="_cgatno_portfolio_view"
          >
            <PortfolioItem
              images={[
                { src: grapecityWebinarsWebp, type: "image/webp" },
                { src: grapecityWebinarsPng, type: "image/png" },
                { src: grapecityWebinarsPng, isFallback: true },
              ]}
            />
          </a>
          <PortfolioItem>
            <h2>NSF Website</h2>
            <p style={{ margin: 0 }}>
              This is a website I made to promote science and learning.
              It&apos;s cool, you should check it out. Go do it! what are you
              waiting for?
            </p>
          </PortfolioItem>
          {/* NSF LG */}
          <a href="https://chemnsfreu.com" target="_cgatno_portfolio_view">
            <PortfolioItem
              images={[
                { src: NSFWebp, type: "image/webp" },
                { src: NSFPng, type: "image/png" },
                { src: NSFPng, isFallback: true },
              ]}
            />
          </a>
          <PortfolioItem>
            <h2>NSF Website</h2>
            <p style={{ margin: 0 }}>
              This is a website I made to promote science and learning.
              It&apos;s cool, you should check it out. Go do it! what are you
              waiting for?
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
                { src: ebookJpg, isFallback: true },
              ]}
            />
          </a>
          <PortfolioItem>
            <p style={{ margin: 0 }}>
              This is a website I made to promote science and learning.
              It&apos;s cool, you should check it out. Go do it! what are you
              waiting for? Heyayyayayyayayayayayayayayayayayay
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
                { src: tuplesPng, isFallback: true },
              ]}
            />
          </a>
          <PortfolioItem>
            <p style={{ margin: 0 }}>
              This is a website I made to promote science and learning.
              It&apos;s cool, you should check it out. Go do it! what are you
              waiting for? Heyayyayayyayayayayayayayayayayayay
            </p>
          </PortfolioItem>
          {/* RT Patterson */}
          <a href="http://rtpatterson.com" target="_cgatno_portfolio_view">
            <PortfolioItem
              images={[
                { src: rtPattersonWebp, type: "image/webp" },
                { src: rtPattersonGif, type: "image/gif" },
                { src: rtPattersonGif, isFallback: true },
              ]}
            />
          </a>
          <PortfolioItem>
            <p style={{ margin: 0 }}>
              This is a website I made to promote science and learning.
              It&apos;s cool, you should check it out. Go do it! what are you
              waiting for? Heyayyayayyayayayayayayayayayayayay
            </p>
          </PortfolioItem>
          {/* Meledia */}
          <a href="https://meledia.com" target="_cgatno_portfolio_view">
            <PortfolioItem
              images={[
                { src: melediaWebp, type: "image/webp" },
                { src: melediaPng, type: "image/png" },
                { src: melediaPng, isFallback: true },
              ]}
            />
          </a>
          <PortfolioItem>
            <p style={{ margin: 0 }}>
              This is a website I made to promote science and learning.
              It&apos;s cool, you should check it out. Go do it! what are you
              waiting for? Heyayyayayyayayayayayayayayayayayay
            </p>
          </PortfolioItem>
        </PortfolioGrid>
      </PortfolioContainer>
    )
  }
}
