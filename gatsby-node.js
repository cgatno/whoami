exports.onCreatePage = ({ page, boundActionCreators }) => {
  const { createPage, deletePage } = boundActionCreators

  return new Promise(resolve => {
    // Remove trailing slash
    const newPage = Object.assign({}, page, {
      path: page.path === "/" ? page.path : page.path.replace(/\/$/, ``),
    })
    if (newPage.path !== page.path) {
      // Remove old page
      deletePage(page)

      // Add new page
      createPage(newPage)
    }

    resolve()
  })
}
