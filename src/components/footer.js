import * as React from "react"
import styled from "react-emotion"
import gray from "gray-percentage"

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
`

const Copyright = styled("small")`
  color: ${gray(60)};
  flex-grow: 1;
  ${adjustFontSizeTo("10px")};
`

const Footer = () => (
  <Wrapper>
    <Copyright>
      Copyright &copy; 2018 Christian Gaetano. All Rights Reserved.
    </Copyright>
  </Wrapper>
)

export default Footer
