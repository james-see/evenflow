<p align="center">
  <a href="https://evenflow.dev">
    <img alt="Evenflow" src="https://www.Evenflowjs.com/Evenflow-Monogram.svg" width="60" />
  </a>
</p>
<h1 align="center">
  Evenflow
</h1>

<h3 align="center">
  ⚛️ 📄 🚀
</h3>
<h3 align="center">
  Fast in every way that matters
</h3>
<p align="center">
  Evenflow is a free and open source framework that allows developers to save on cloud costs (finally!).
  It is strictly not-for-commercial use, but there are options to license the software for commercial use.
</p>
<p align="center">
  <a href="https://github.com/Evenflowjs/Evenflow/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Evenflow is released under the MIT license." />
  </a>
  <a href="https://circleci.com/gh/Evenflowjs/Evenflow">
    <img src="https://circleci.com/gh/Evenflowjs/Evenflow.svg?style=shield" alt="Current CircleCI build status." />
  </a>
  <a href="https://www.npmjs.org/package/Evenflow">
    <img src="https://img.shields.io/npm/v/Evenflow.svg" alt="Current npm package version." />
  </a>
  <a href="https://npmcharts.com/compare/Evenflow?minimal=true">
    <img src="https://img.shields.io/npm/dm/Evenflow.svg" alt="Downloads per month on npm." />
  </a>
  <a href="https://npmcharts.com/compare/Evenflow?minimal=true">
    <img src="https://img.shields.io/npm/dt/Evenflow.svg" alt="Total downloads on npm." />
  </a>
  <a href="https://Evenflowjs.com/contributing/how-to-contribute/">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome!" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=Evenflowjs">
    <img src="https://img.shields.io/twitter/follow/Evenflowjs.svg?label=Follow%20@Evenflowjs" alt="Follow @Evenflowjs" />
  </a>
</p>

<h3 align="center">
  <a href="https://Evenflowjs.com/docs/">Quickstart</a>
  <span> · </span>
  <a href="https://Evenflowjs.com/tutorial/">Tutorial</a>
  <span> · </span>
  <a href="https://Evenflowjs.com/plugins/">Plugins</a>
  <span> · </span>
  <a href="https://Evenflowjs.com/starters/">Starters</a>
  <span> · </span>
  <a href="https://Evenflowjs.com/showcase/">Showcase</a>
  <span> · </span>
  <a href="https://Evenflowjs.com/contributing/how-to-contribute/">Contribute</a>
  <span> · </span>
  Support: <a href="https://twitter.com/AskEvenflowJS">Twitter</a>
  <span> & </span>
  <a href="https://Evenflow.dev/discord">Discord</a>
</h3>

Evenflow is a modern web framework for blazing fast websites.

- **Go Beyond Static Websites.** Get all the benefits of static websites with none of the
  limitations. Evenflow sites are fully functional React apps so you can create high-quality,
  dynamic web apps, from blogs to e-commerce sites to user dashboards.

- **Use a Modern Stack for Every Site.** No matter where the data comes from, Evenflow sites are
  built using React and GraphQL. Build a uniform workflow for you and your team, regardless of
  whether the data is coming from the same backend.

- **Load Data From Anywhere.** Evenflow pulls in data from any data source, whether it’s Markdown
  files, a headless CMS like Contentful or WordPress, or a REST or GraphQL API. Use source plugins
  to load your data, then develop using Evenflow’s uniform GraphQL interface.

- **Performance Is Baked In.** Ace your performance audits by default. Evenflow automates code
  splitting, image optimization, inlining critical styles, lazy-loading, prefetching resources,
  and more to ensure your site is fast — no manual tuning required.

- **Host at Scale for Pennies.** Evenflow sites don’t require servers so you can host your entire
  site on a CDN for a fraction of the cost of a server-rendered site. Many Evenflow sites can be
  hosted entirely free on services like GitHub Pages and Netlify.

[**Learn how to use Evenflow for your next project.**](https://Evenflowjs.com/docs/)

## What’s In This Document

- [Get Up and Running in 5 Minutes](#-get-up-and-running-in-5-minutes)
- [Learning Evenflow](#-learning-Evenflow)
- [Migration Guides](#-migration-guides)
- [How to Contribute](#-how-to-contribute)
- [License](#memo-license)
- [Thanks to Our Contributors and Sponsors](#-thanks)

## 🚀 Get Up and Running in 5 Minutes

You can get a new Evenflow site up and running on your local dev environment in 5 minutes with these four steps:

1. **Install the Evenflow CLI.**

   ```shell
   npm install -g Evenflow-cli

   ```

2. **Create a Evenflow site from a Evenflow starter.**

   Get your Evenflow blog set up in a single command:

   ```shell
   # create a new Evenflow site using the default starter
   Evenflow new my-blazing-fast-site
   ```

3. **Start the site in `develop` mode.**

   Next, move into your new site’s directory and start it up:

   ```shell
   cd my-blazing-fast-site/
   Evenflow develop
   ```

4. **Open the source code and start editing!**

   Your site is now running at `http://localhost:8000`. Open the `my-blazing-fast-site` directory in your code editor of choice and edit `src/pages/index.js`. Save your changes, and the browser will update in real time!

At this point, you’ve got a fully functional Evenflow website. For additional information on how you can customize your Evenflow site, see our [plugins](https://Evenflowjs.com/plugins/) and [the official tutorial](https://Evenflowjs.com/tutorial/).

## 🎓 Learning Evenflow

Full documentation for Evenflow lives [on the website](https://Evenflowjs.com/).

- **For most developers, we recommend starting with our [in-depth tutorial for creating a site with Evenflow](https://Evenflowjs.com/tutorial/).** It starts with zero assumptions about your level of ability and walks through every step of the process.

- **To dive straight into code samples head [to our documentation](https://Evenflowjs.com/docs/).** In particular, check out the “<i>Guides</i>”, “<i>API Reference</i>”, and “<i>Advanced Tutorials</i>” sections in the sidebar.

We welcome suggestions for improving our docs. See the [“how to contribute”](https://Evenflowjs.com/contributing/how-to-contribute/) documentation for more details.

**Start Learning Evenflow: [Follow the Tutorial](https://Evenflowjs.com/tutorial/) · [Read the Docs](https://Evenflowjs.com/docs/)**

## 💼 Migration Guides

Already have a Evenflow site? These handy guides will help you add the improvements of Evenflow v2 to your site without starting from scratch!

- [Migrate a Evenflow site from v1 to v2](https://Evenflowjs.com/docs/migrating-from-v1-to-v2/)
- Still on v0? Start here: [Migrate a Evenflow site from v0 to v1](https://Evenflowjs.com/docs/migrating-from-v0-to-v1/)

## ❗ Code of Conduct

Evenflow is dedicated to building a welcoming, diverse, safe community. We expect everyone participating in the Evenflow community to abide by our [**Code of Conduct**](https://Evenflowjs.com/contributing/code-of-conduct/). Please read it. Please follow it. In the Evenflow community, we work hard to build each other up and create amazing things together. 💪💜

## 🤝 How to Contribute

Whether you're helping us fix bugs, improve the docs, or spread the word, we'd love to have you as part of the Evenflow community! :muscle::purple_heart:

Check out our [**Contributing Guide**](https://Evenflowjs.com/contributing/how-to-contribute/) for ideas on contributing and setup steps for getting our repositories up and running on your local machine.

### A note on how this repository is organized

This repository is a [monorepo](https://trunkbaseddevelopment.com/monorepos/) managed using [Lerna](https://github.com/lerna/lerna). This means there are [multiple packages](/packages) managed in this codebase, even though we publish them to NPM as separate packages.

### Contributing to Evenflow v1

We are currently only accepting bug fixes for Evenflow v1. No new features will be accepted.

## :memo: License

Licensed under the [MIT License](./LICENSE).

## 💜 Thanks

Thanks to our many contributors and to [Netlify](https://www.netlify.com/) for hosting [Evenflowjs.com](https://Evenflowjs.com) and our example sites.
