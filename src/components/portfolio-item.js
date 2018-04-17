import * as React from "react"
import PropTypes from "prop-types"
import styled from "react-emotion"
import vibrant from "node-vibrant"

/* eslint-disable import/named */
import { rhythm } from "../utils/typography"
/* eslint-enable import/named */

const PortfolioItemWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: ${rhythm(1)} ${props => (props.hasImage ? rhythm(1.5) : 0)};
  height: 100%;
  background-color: ${props => props.bgColor};
  transition: background-color 0.35s ease-in-out;
  &:hover {
    background-color: ${props => props.hoverColor};
  }
  img {
    width: 100%;
    object-fit: cover;
  }

  @media screen and (max-width: 505px) {
    padding: ${rhythm(1)} ${props => (props.hasImage ? rhythm(1) : 0)};
  }
`

class PortfolioItem extends React.Component {
  constructor(props) {
    super(props)

    // Each item will maintain a specific background color
    // If images are supplied, grab background color from image
    // Otherwise, use a random color from the gradient palette
    // Always start out with white
    this.state = {
      bgColor: "transparent",
      hoverColor: "transparent",
    }
  }

  componentDidMount() {
    // If item has images to show, use them to get a good background color
    const { images } = this.props
    if (images && images.length > 0) {
      // First, get the easily processable fallback image
      const fallback = images.find(image => image.isFallback)
      // Make sure fallback was supplied, then get palette with Vibrant
      if (fallback) {
        vibrant
          .from(fallback.src)
          .getPalette()
          .then(palette => {
            // Update state once palette is retrieved
            this.setState({
              bgColor: palette.Vibrant.getHex(),
              hoverColor: palette.DarkVibrant.getHex(),
            })
          })
          .catch(err => console.error(err))
      }
    }
  }

  render() {
    const { images, children, ...rest } = this.props
    return (
      <PortfolioItemWrapper
        bgColor={this.state.bgColor}
        hoverColor={this.state.hoverColor}
        hasImage={images && images.length > 0}
        {...rest}
      >
        {images ? (
          <picture>
            {images.map(
              image =>
                image.isFallback ? (
                  <img
                    key={`fallback-${image.src}`}
                    src={image.src}
                    alt={image.alt}
                  />
                ) : (
                  <source
                    key={image.src}
                    srcSet={image.src}
                    type={image.type}
                  />
                )
            )}
          </picture>
        ) : (
          children
        )}
      </PortfolioItemWrapper>
    )
  }
}

PortfolioItem.propTypes = {
  children: PropTypes.node,
  images: PropTypes.arrayOf(PropTypes.object),
}

export default PortfolioItem
