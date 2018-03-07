import * as React from "react"
import PropTypes from "prop-types"
import styled from "react-emotion"
import gray from "gray-percentage"

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
  margin-bottom: ${rhythm(1)};
  padding-bottom: ${rhythm(1 / 2)};
  border-bottom: 1px solid ${gray(80)};
`

// Contains logo, name, subtitle
const Brand = styled("div")`
  display: flex;
  flex-direction: row;
  align-items: center;

  /* Bump down menu before things get too cramped */
  margin-right: 40px;

  h1 {
    color: ${colors.primaryColorLight};
    margin: 0;
    ${adjustFontSizeTo(`${18 * 1.5}px`)};
  }

  h2 {
    margin: 0 0 0 ${3 / 18}em;
    color: ${gray(54)};
    ${adjustFontSizeTo(`${18 * (3 / 4)}px`)};
  }

  @media screen and (max-width: 653px) {
    margin-bottom: ${rhythm(1)};
    margin-right: 0;
  }

  @media screen and (max-width: 480px) {
    text-align: center;
  }
`

const Logo = styled("img")`
  display: block;
  height: 65px;
  margin: 0 15px 0 0;

  @media screen and (max-width: 480px) {
    display: none;
  }
`

// <nav> element for wrapping the menu
const MenuWrapper = styled("nav")`
  margin-left: auto;
  @media screen and (max-width: 660px) {
    margin: 0;
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

const Menu = ({ children }) => (
  <Wrapper>
    <Brand>
      <picture>
        <source srcSet={LogoWEBP} type="image/webp" />
        <source srcSet={LogoPNG} type="image/png" />
        <Logo src={LogoPNG} />
      </picture>
      <div>
        <h1>Christian Gaetano</h1>
        <h2>Software Engineer & Dabbling Designer</h2>
      </div>
    </Brand>
    <MenuWrapper role="navigation">
      <MenuList>
        <MenuItem>Home</MenuItem>
        <MenuItem>Work</MenuItem>
        <MenuItem>Blog</MenuItem>
        <MenuItem>Resume</MenuItem>
      </MenuList>
      {children}
    </MenuWrapper>
  </Wrapper>
)

Menu.propTypes = {
  children: PropTypes.arrayOf(PropTypes.element).isRequired,
}

export default Menu
