import { NextConfig } from 'next'
import { codeInspectorPlugin } from 'code-inspector-plugin'

const isGitHubPagesBuild = process.env.GITHUB_PAGES_BUILD === 'true'

const nextConfig: NextConfig = {
	devIndicators: false,
	reactStrictMode: false,
	reactCompiler: true,
	...(isGitHubPagesBuild
		? {
				output: 'export' as const,
				trailingSlash: true,
				distDir: 'docs',
				images: {
					unoptimized: true
				}
			}
		: {
				async redirects() {
					return [
						{
							source: '/zh',
							destination: '/',
							permanent: true
						},
						{
							source: '/en',
							destination: '/',
							permanent: true
						}
					]
				}
			}),
	pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
	typescript: {
		ignoreBuildErrors: true
	},
	experimental: {
		scrollRestoration: false
	},
	turbopack: {
		rules: {
			'*.svg': {
				loaders: ['@svgr/webpack'],
				as: '*.js'
			}
			// ...codeInspectorPlugin({
			// 	bundler: 'turbopack'
			// })
		},

		resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', 'css']
	},
	webpack: config => {
		config.module.rules.push({
			test: /\.svg$/i,
			use: [{ loader: '@svgr/webpack', options: { svgo: false } }]
		})

		return config
	}
}

export default nextConfig
