module.exports = {
  plugins: [
    {
      resolve: `gatsby-plugin-typography`,
      options: {
        pathToConfigModule: `src/utils/typography`,
      },
    },
    {
      resolve: `gatsby-plugin-canonical-urls`,
      options: {
        siteUrl: `https://christiangaetano.com`,
      },
    },
    `gatsby-plugin-emotion`,
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-netlify`,
  ],
}
