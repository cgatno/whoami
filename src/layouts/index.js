import * as React from "react"
import PropTypes from "prop-types"
import styled, { css, injectGlobal } from "react-emotion"
import Helmet from "react-helmet"

/* eslint-disable import/named */
import { rhythm } from "../utils/typography"
/* eslint-enable import/named */
import colors from "../utils/colors"

import Menu from "../components/menu"
import Footer from "../components/footer"

// Generate global default styling for a tags
/* eslint-disable no-unused-expressions */
injectGlobal`
  a {
    color: ${colors.primaryColorLight};
    transition: 0.3s ease-in-out;

    &:hover {
      color: ${colors.primaryColor};
    }
  }
`
/* eslint-enable no-unused-expressions */

// Generate a special class we can apply to the document body
const HotBod = css`
  background: #fcfcfc;
  padding: 0;
  margin: 0;
`

const PageWrapper = styled("main")`
  /* A page is basically a big column, so use flexbox to lay out sections */
  position: relative;
  max-width: 960px;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  padding: 2.5rem 0;

  @media screen and (max-width: 990px) {
    padding-left: ${rhythm(2)};
    padding-right: ${rhythm(2)};
  }
`

const Content = styled("div")`
  position: relative;
  width: 100%;

  /* Image formatting */
  img {
    max-width: 100%;
    margin: ${rhythm(1)} auto;
    display: block;
  }
`

class Template extends React.Component {
  render() {
    return (
      <PageWrapper>
        <Helmet
          bodyAttributes={{ class: HotBod }}
          htmlAttributes={{ lang: "en-US" }}
        >
          <meta name="theme-color" content={colors.primaryColorLight} />
        </Helmet>
        <Menu location={this.props.location} />
        <Content>{this.props.children()}</Content>
        <Footer />
      </PageWrapper>
    )
  }
}

Template.propTypes = {
  children: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
}

export default Template
