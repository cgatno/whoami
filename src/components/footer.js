import * as React from "react"
import styled from "react-emotion"
import gray from "gray-percentage"
import Link from "gatsby-link"
import FontAwesomeIcon from "@fortawesome/react-fontawesome"
import faInsta from "@fortawesome/fontawesome-free-brands/faInstagram"
import faTwitter from "@fortawesome/fontawesome-free-brands/faTwitter"
import faCodepen from "@fortawesome/fontawesome-free-brands/faCodepen"
import faGithub from "@fortawesome/fontawesome-free-brands/faGithub"

/* eslint-disable import/named */
import { rhythm, adjustFontSizeTo } from "../utils/typography"
/* eslint-enable import/named */

const Wrapper = styled("footer")`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  margin-top: ${rhythm(2)};
  padding-top: ${rhythm(1)};
  border-top: 1px solid ${gray(80)};
  position: relative;
  color: ${gray(60)};
`

const Column = styled("div")`
  flex-grow: 1;
  flex-direction: column;
`

const SmallText = styled("small")`
  ${adjustFontSizeTo("10px")};
  display: block;

  a {
    color: inherit;
  }
`

const SocialLink = styled("a")`
  color: inherit;
  margin-right: 10px;
  display: inline-block;
  padding: 0 2px;
  ${adjustFontSizeTo("16px")};

  &:last-child {
    margin-right: 0;
  }

  &:hover {
    color: ${props => props.hoverColor || gray(20)};
  }
`

// Special styling for instagram link - gradient on hover
const InstaLink = styled("a")`
  /* TODO: consolidate this duplicate CSS */
  position: relative;
  color: inherit;
  margin-right: 10px;
  display: inline-block;
  ${adjustFontSizeTo("16px")};

  &:hover {
    color: #000;
  }

  &:last-child {
    margin-right: 0;
  }

  .inner {
    background: #fcfcfc;
    mix-blend-mode: screen;
    padding: 0 2px;
    line-height: 1rem;
  }

  .bg {
    background: #000;
    width: calc(100% - 1.5px);

    &::before {
      content: "";
      background: linear-gradient(
        45deg,
        #f09433 0%,
        #e6683c 25%,
        #dc2743 50%,
        #cc2366 75%,
        #bc1888 100%
      );
      position: absolute;
      top: 0;
      left: 0;
      width: calc(100% - 2px);
      height: 100%;
      opacity: 0;
      transition: 0.3s ease-in-out;
    }
  }

  &:hover .bg::before {
    opacity: 1;
  }
`

const Footer = () => (
  <Wrapper>
    <Column>
      <SmallText>
        Copyright &copy; 2018 Christian Gaetano. All Rights Reserved.
      </SmallText>
      <SmallText>
        <Link to="/privacy">I respect your privacy</Link>
      </SmallText>
    </Column>
    <div>
      <InstaLink
        href="https://instagram.com/cgatno"
        target="_cgatno_instagram"
        aria-label="My Instagram feed consists of lots of photos of my dog with captions that are way too long if pictures really are worth a thousand words."
      >
        <div className="bg">
          <div className="inner">
            <FontAwesomeIcon icon={faInsta} />
          </div>
        </div>
      </InstaLink>
      <SocialLink
        href="https://twitter.com/cgatno"
        target="_cgatno_twitter"
        aria-label="Check out my Twitter if you're looking for web development tips, news, and hot takes with a snarky twist."
        hoverColor="#48A1EC"
      >
        <FontAwesomeIcon icon={faTwitter} />
      </SocialLink>
      <SocialLink
        href="https://github.com/cgatno"
        target="_cgatno_github"
        aria-label="Check out my Twitter if you're looking for web development tips, news, and hot takes with a snarky twist."
        hoverColor="#171515"
      >
        <FontAwesomeIcon icon={faGithub} />
      </SocialLink>
      <SocialLink
        href="https://codepen.io/cgatno/"
        target="_cgatno_codepen"
        aria-label="Check out my Twitter if you're looking for web development tips, news, and hot takes with a snarky twist."
        hoverColor="#000"
      >
        <FontAwesomeIcon icon={faCodepen} />
      </SocialLink>
    </div>
  </Wrapper>
)

export default Footer
