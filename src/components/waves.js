import * as React from "react"
import styled, { keyframes } from "react-emotion"

import colors from "../utils/colors"

const Wrapper = styled("div")`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  z-index: -1;
`
const Drift = keyframes`
  from {
    transform: rotate(0deg);
  }
  from {
    transform: rotate(360deg);
  }
`

const Layer = styled("div")`
  opacity: ${props => props.opacity || "0.4"};
  position: absolute;
  top: 110%;
  background-image: linear-gradient(
    90deg,
    ${colors.primaryColor} 0,
    ${colors.primaryColorLight}
  );
  width: 100%;
  height: 0;
  padding-top: 100%;
  -webkit-transform-origin: 50% 48%;
  -ms-transform-origin: 50% 48%;
  transform-origin: 50% 48%;
  border-radius: 45%;
  animation: ${Drift} ${props => props.animationTime || "8s"} infinite linear;
`

const Waves = () => (
  <Wrapper>
    <Layer />
    <Layer animationTime="10s" />
    <Layer opacity="0.2" animationTime="10s" />
  </Wrapper>
)

export default Waves
