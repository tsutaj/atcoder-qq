/** @type {import('next').NextConfig} */

module.exports = {
  async rewrites() {
    return [
      {
        source: "/users/:slug",
        destination: "https://atcoder.jp/users/:slug/history/json",
      },
      {
        source: "/contests",
        destination: "https://kenkoooo.com/atcoder/resources/contests.json",
      }
    ];
  },
};
