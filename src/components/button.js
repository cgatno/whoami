import styled from "react-emotion"

/* eslint-disable import/named */
import { rhythm } from "../utils/typography"
/* eslint-enable import/named */
import colors from "../utils/colors"

const Button = styled("a")`
  position: relative;
  display: inline-block;
  padding: 10px 15px;
  color: #fff;
  font-weight: 700;
  margin: ${rhythm(1)} 0;
  background: ${colors.primaryColorLight};
  border-radius: 5px;
  font-family: ${["Lato", "sans-serif"].join(",")};
  cursor: pointer;
  border: 1px solid ${colors.primaryColorLight};
  text-decoration: none;

  &:hover {
    color: ${colors.primaryColorLight};
    background: #fff;
  }
`

export default Button
