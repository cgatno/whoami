import * as React from "react"
import Helmet from "react-helmet"
import styled from "react-emotion"

import { getRandomGradientColor } from "../utils/colors"

import PortfolioItem from "../components/portfolio-item"

// Import portfolio imagery
import NSFWebp from "../images/portfolio/chemnsfreu.webp"
import NSFPng from "../images/portfolio/chemnsfreu.png"

import ebookWebp from "../images/portfolio/ebook.webp"
import ebookJpg from "../images/portfolio/ebook.jpg"

const PortfolioGrid = styled("div")`
  display: grid;
  grid-template-columns: [first] 1fr 1fr [last];
  grid-auto-rows: 100px;
  grid-gap: 10px 10px;
`

export default class Work extends React.Component {
  render() {
    return (
      <div>
        <Helmet>
          <title>Christian Gaetano — Full Stack Web Engineer — Resume</title>
          <link rel="canonical" href="https://christiangaetano.com/work" />
          <meta
            name="description"
            content="For you professional types, check out a listing of my work experiences and education online. If you're stretched for time, you can download a PDF, too!"
          />
        </Helmet>
        <PortfolioGrid>
          <PortfolioItem
            style={{
              gridColumn: "1 / 2",
              gridRow: "1 / 4",
              background: getRandomGradientColor(),
            }}
            images={[
              {
                src: NSFWebp,
                type: "image/webp",
              },
              {
                src: NSFPng,
                type: "image/png",
              },
              {
                src: NSFPng,
                isFallback: true,
              },
            ]}
          />
          <PortfolioItem
            style={{
              gridColumn: "2 / 3",
              gridRow: "1 / 3",
              background: getRandomGradientColor(),
            }}
          >
            <h2>NSF Website</h2>
            <p style={{ margin: 0 }}>
              This is a website I made to promote science and learning. It's
              cool, you should check it out. Go do it! what are you waiting for?
            </p>
          </PortfolioItem>
          <PortfolioItem
            style={{
              gridColumn: "2 / 3",
              gridRow: "3 / 4",
              background: getRandomGradientColor(),
            }}
          >
            <p style={{ margin: 0 }}>
              This is a website I made to promote science and learning. It's
              cool, you should check it out. Go do it! what are you waiting for?
            </p>
          </PortfolioItem>
          <PortfolioItem
            style={{
              gridColumn: "2 / 3",
              gridRow: "4 / 8",
              background: getRandomGradientColor(),
            }}
            images={[
              {
                src: ebookWebp,
                type: "image/webp",
              },
              {
                src: ebookJpg,
                type: "image/jpg",
              },
              {
                src: ebookJpg,
                isFallback: true,
              },
            ]}
          />
        </PortfolioGrid>
      </div>
    )
  }
}
