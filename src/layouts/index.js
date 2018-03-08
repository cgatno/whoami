import * as React from "react"
import PropTypes from "prop-types"
import styled, { css } from "react-emotion"
import Helmet from "react-helmet"

import { rhythm } from "../utils/typography"

import Menu from "../components/menu"

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

  @media screen and (max-width: 980px) {
    padding-left: ${rhythm(2)};
    padding-right: ${rhythm(2)};
  }
`

class Template extends React.Component {
  render() {
    return (
      <PageWrapper>
        <Helmet
          bodyAttributes={{ class: HotBod }}
          htmlAttributes={{ lang: "en-US" }}
        />
        <Menu />
        <div>{this.props.children()}</div>
      </PageWrapper>
    )
  }
}

Template.propTypes = {
  children: PropTypes.func.isRequired,
}

export default Template
