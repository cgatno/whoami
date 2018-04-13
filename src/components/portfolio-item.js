import * as React from "react"
import PropTypes from "prop-types"
import styled from "react-emotion"

/* eslint-disable import/named */
import { rhythm } from "../utils/typography"
/* eslint-enable import/named */

const PortfolioItemWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: ${rhythm(1)} ${rhythm(1.5)};

  &:hover img {
    max-width: 960px;
    position: absolute;
  }

  img {
    margin: 0;
    padding: 0;
    max-width: 100%;
    transition: 1s ease-in-out;
  }
`

const PortfolioItem = ({ images, children, ...rest }) => (
  <PortfolioItemWrapper {...rest}>
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
              <source key={image.src} srcSet={image.src} type={image.type} />
            )
        )}
      </picture>
    ) : (
      children
    )}
  </PortfolioItemWrapper>
)

PortfolioItem.propTypes = {
  children: PropTypes.arrayOf(PropTypes.node),
  images: PropTypes.arrayOf(PropTypes.object),
}

export default PortfolioItem
