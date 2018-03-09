import * as React from "react"
import PropTypes from "prop-types"
import styled from "react-emotion"
import gray from "gray-percentage"
import Link from "gatsby-link"

import colors from "../utils/colors"
import { rhythm, adjustFontSizeTo } from "../utils/typography"

// Primary mark
import LogoPNG from "../images/primary-logo.png"
import LogoWEBP from "../images/primary-logo.webp"

// Outermost flexbox wrapper for the entire menu
const Wrapper = styled("header")`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-bottom: ${rhythm(2)};
  padding-bottom: ${rhythm(1 / 2)};
  border-bottom: 1px solid ${gray(80)};
`

// Contains logo, name, subtitle
const Brand = styled("div")`
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  align-items: center;

  /* Bump down menu before things get too cramped */
  margin-bottom: ${rhythm(1 / 2)};

  h1 {
    color: ${colors.primaryColorLight};
    margin: 0;
    ${adjustFontSizeTo(`${18 * 1.5}px`)};
  }

  h2 {
    margin: 0 0 0 ${3 / 18}em;
    color: ${gray(54)};
    ${adjustFontSizeTo(`${18 * (4 / 5)}px`)};
  }
`

const Logo = styled("img")`
  display: block;
  height: 65px;
  margin: 0 15px 0 0;

  @media screen and (max-width: 440px) {
    display: none;
  }
`

// Menu list and individual items
const MenuList = styled("ul")`
  list-style: none;
  margin: 0;
  padding: 0;
  font-family: ${["Lato", "serif"].join(", ")};
  text-transform: uppercase;
  letter-spacing: ${rhythm(1 / 36)};
  ${adjustFontSizeTo(`${18 * (3 / 4)}px`)};
`

const MenuItem = styled("li")`
  display: inline-block;
  margin: 0 10px;
  padding: 0;

  &:first-child {
    margin-left: 0;
  }
  &:last-child {
    margin-right: 0;
  }
`

const MenuLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  transition: 0.2s ease-in-out;

  &:hover {
    color: ${colors.primaryColorLight};
  }
`

const MenuA = MenuLink.withComponent("a")

const Menu = ({ children, location }) => (
  <Wrapper>
    <Brand>
      <Link to="/">
        <picture>
          <source srcSet={LogoWEBP} type="image/webp" />
          <source srcSet={LogoPNG} type="image/png" />
          <Logo src={LogoPNG} />
        </picture>
      </Link>
      {location.pathname !== "/resume" && (
        <div>
          <h1>Christian Gaetano</h1>
          <h2>Software Engineer &amp; Dabbling Designer</h2>
        </div>
      )}
    </Brand>
    <nav role="navigation">
      <MenuList>
        <MenuItem>
          <MenuLink to="/">Home</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/">Work</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/">Blog</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/resume">Resume</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuA href="https://github.com/cgatno" target="_cgatno_github">
            Code
          </MenuA>
        </MenuItem>
      </MenuList>
      {children}
    </nav>
  </Wrapper>
)

Menu.propTypes = {
  children: PropTypes.arrayOf(PropTypes.element),
  location: PropTypes.object.isRequired,
}

Menu.defaultProps = {
  children: [],
}

export default Menu
