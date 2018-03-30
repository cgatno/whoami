import styled from "react-emotion"

/* eslint-disable import/named */
import { rhythm } from "../utils/typography"
/* eslint-enable import/named */
import colors from "../utils/colors"

const Divider = styled("div")`
  display: block;
  position: relative;
  height: 1px;
  width: 100%;
  margin: ${rhythm(1)} 0;
  background: ${colors.lightText};
`

export default Divider
