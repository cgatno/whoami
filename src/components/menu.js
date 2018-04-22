import * as React from "react"
import PropTypes from "prop-types"
import styled from "react-emotion"
import gray from "gray-percentage"
import Link from "gatsby-link"

import colors from "../utils/colors"
/* eslint-disable import/named */
import { rhythm, adjustFontSizeTo } from "../utils/typography"
/* eslint-enable import/named */

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
  position: relative;

  @media screen and (max-width: 440px) {
    border-bottom-color: transparent;
  }
`

// Contains logo, name, subtitle
const Brand = styled(Link)`
  display: flex;
  flex-direction: row;
  align-items: center;
  text-decoration: none;
  margin-right: auto;

  /* Bump down menu before things get too cramped */
  margin-bottom: ${rhythm(1 / 2)};

  h1 {
    color: ${colors.primaryColorLight};
    margin: 0;
    ${adjustFontSizeTo(`${18 * 1.5}px`)};
  }

  h2 {
    margin: 0 0 0 ${3 / 18}em;
    color: ${gray(40)};
    ${adjustFontSizeTo(`${18 * (4 / 5)}px`)};
  }

  @media screen and (max-width: 460px) {
    h2 {
      display: none;
    }

    margin-bottom: 0;
  }
`

const Logo = styled("img")`
  display: block;
  height: 65px;
  margin: 0 15px 0 0;

  @media screen and (max-width: 520px) {
    display: none;
  }
`

// Button to toggle menu on small devices
const ToggleMenu = styled("button")`
  @media screen and (min-width: 780px) {
    display: none;
  }

  display: block;
  padding: 0;
  z-index: 101;
  background: 0 0;
  box-sizing: border-box;
  border: 0;
  width: 7.5vw;
  max-width: 40px;
  font-size: 0;
  position: relative;
  cursor: pointer;
  outline: 0;

  .label {
    display: block;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;

    &::before,
    &::after {
      content: "";
      position: relative;
      display: block;
      transition: 0.9s ease;
      height: 3px;
      background: ${props =>
        props.menuOpen ? "#fff" : colors.primaryColorLight};
    }

    &::before {
      margin-bottom: 6px;
    }

    &::after {
      margin-top: 6px;
    }
  }
`

// Containing nav element for menu - goes fullscreen on small devices
const MenuWrapper = styled("nav")`
  @media screen and (max-width: 780px) {
    position: fixed;
    background: ${colors.primaryColorLight};
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    height: 100%;
    z-index: 100;
    box-sizing: border-box;
    box-shadow: 10px 0 15px -2px rgba(0, 0, 0, 0.1);
    transform-origin: right bottom;
    transform: translate3d(
        ${props => (props.menuOpen ? 0 : "calc(-100% - 15px)")},
        0,
        0
      )
      skew(${props => (props.menuOpen ? 0 : "30deg")});
    transition: 0.9s ease;
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

  @media screen and (max-width: 780px) {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    padding: 0 ${rhythm(2)};
  }
`

const MenuItem = styled("li")`
  display: inline-block;
  margin: 0 10px;
  padding: 0;

  @media screen and (max-width: 780px) {
    display: block;
    margin: ${rhythm(1)} 0;
  }

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
  transition: 0.3s ease-in-out;

  &:hover {
    color: ${colors.primaryColorLight};
  }

  @media screen and (max-width: 780px) {
    color: #fff;
    ${adjustFontSizeTo(`${18 * 3}px`)};

    &:hover {
      color: ${colors.primaryColor};
    }
  }
`

const MenuA = MenuLink.withComponent("a")

class Menu extends React.Component {
  constructor(props) {
    super(props)

    // Keep track of whether or not full screen menu is open
    // Closed by default
    this.state = {
      menuOpen: false,
    }
  }

  // TODO: update to getDerivedStateFromProps when updating to new React release
  componentWillReceiveProps(nextProps, prevState) {
    // Hook into window location changes to hide menu on nav
    if (prevState.location !== nextProps.location) {
      // New window location, make sure menu is closed
      this.setState({
        menuOpen: false,
      })
    }
  }

  render() {
    const { children, location } = this.props
    return (
      <Wrapper resumeOpen={location.pathname.match(/\/resume\/?/)}>
        <Brand to="/" aria-label="Head back to the home page.">
          <picture>
            <source srcSet={LogoWEBP} type="image/webp" />
            <source srcSet={LogoPNG} type="image/png" />
            <Logo
              src={LogoPNG}
              alt="Happily sacrificing sanity in pursuit of pixel perfection."
            />
          </picture>
          {!location.pathname.match(/\/resume\/?/) && (
            <div>
              <h1>Christian Gaetano</h1>
              <h2>Software Engineer &amp; Dabbling Designer</h2>
            </div>
          )}
        </Brand>
        <MenuWrapper role="navigation" menuOpen={this.state.menuOpen}>
          <MenuList>
            <MenuItem>
              <MenuLink to="/">Home</MenuLink>
            </MenuItem>
            <MenuItem>
              <MenuLink to="/work/">Work</MenuLink>
            </MenuItem>
            <MenuItem>
              <MenuLink to="/resume/">Resume</MenuLink>
            </MenuItem>
            <MenuItem>
              <MenuA href="https://github.com/cgatno" target="_cgatno_github">
                Code
              </MenuA>
            </MenuItem>
          </MenuList>
          {children}
        </MenuWrapper>
        <ToggleMenu
          type="button"
          aria-label="Menu"
          aria-controls="navigation"
          menuOpen={this.state.menuOpen}
          onClick={() =>
            this.setState(prevState => ({ menuOpen: !prevState.menuOpen }))
          }
        >
          <span className="label">Menu</span>
        </ToggleMenu>
      </Wrapper>
    )
  }
}

Menu.propTypes = {
  children: PropTypes.arrayOf(PropTypes.element),
  location: PropTypes.object.isRequired,
}

Menu.defaultProps = {
  children: [],
}

export default Menu
