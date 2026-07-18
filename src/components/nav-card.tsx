'use client'

import Card from '@/components/card'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useCenterStore } from '@/hooks/use-center'
import { CARD_SPACING } from '@/consts'
import ScrollOutlineSVG from '@/svgs/scroll-outline.svg'
import ScrollFilledSVG from '@/svgs/scroll-filled.svg'
import { BookOpen, BriefcaseBusiness, FlaskConical } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { cn } from '@/lib/utils'
import { useSize } from '@/hooks/use-size'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { HomeDraggableLayer } from '@/app/(home)/home-draggable-layer'
import { useBlogIndex } from '@/hooks/use-blog-index'

const list = [
	{
		icon: ScrollOutlineSVG,
		iconActive: ScrollFilledSVG,
		label: '全部文章',
		href: '/blog'
	},
	{
		icon: BriefcaseBusiness,
		iconActive: BriefcaseBusiness,
		label: '工作日志',
		href: '/blog?category=工作日志'
	},
	{
		icon: BookOpen,
		iconActive: BookOpen,
		label: '学习笔记',
		href: '/blog?category=学习笔记'
	},
	{
		icon: FlaskConical,
		iconActive: FlaskConical,
		label: '项目实践',
		href: '/blog?category=项目实践'
	}
]

const extraSize = 8

export default function NavCard() {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const currentCategory = searchParams.get('category')?.trim() || ''
	const center = useCenterStore()
	const [show, setShow] = useState(false)
	const { maxSM } = useSize()
	const [hoveredIndex, setHoveredIndex] = useState<number>(0)
	const { siteContent, cardStyles } = useConfigStore()
	const { items } = useBlogIndex()
	const styles = cardStyles.navCard
	const hiCardStyles = cardStyles.hiCard
	const articleCountByCategory = useMemo(() => {
		const counts = new Map<string, number>()
		for (const item of items) {
			if (!item.category) continue
			counts.set(item.category, (counts.get(item.category) || 0) + 1)
		}
		return counts
	}, [items])

	const activeIndex = useMemo(() => {
		const index = list.findIndex(item => {
			const [itemPath, query = ''] = item.href.split('?')
			const itemCategory = new URLSearchParams(query).get('category') || ''
			return pathname === itemPath && currentCategory === itemCategory
		})
		return index >= 0 ? index : undefined
	}, [pathname, currentCategory])

	useEffect(() => {
		setShow(true)
	}, [])

	let form = useMemo(() => {
		if (pathname == '/') return 'full'
		else return 'icons'
	}, [pathname])
	if (maxSM) form = 'icons'

	const itemHeight = form === 'full' ? 52 : 28

	let position = useMemo(() => {
		if (form === 'full') {
			const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x - hiCardStyles.width / 2 - styles.width - CARD_SPACING
			const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 - styles.height
			return { x, y }
		}

		return {
			x: 24,
			y: 16
		}
	}, [form, center, styles, hiCardStyles])

	const size = useMemo(() => {
		if (form === 'mini') return { width: 64, height: 64 }
		else if (form === 'icons') return { width: 340, height: 64 }
		else return { width: styles.width, height: styles.height }
	}, [form, styles])

	useEffect(() => {
		if (form === 'icons' && activeIndex !== undefined && hoveredIndex !== activeIndex) {
			const timer = setTimeout(() => {
				setHoveredIndex(activeIndex)
			}, 1500)
			return () => clearTimeout(timer)
		}
	}, [hoveredIndex, activeIndex, form])

	if (maxSM) position = { x: center.x - size.width / 2, y: 16 }

	if (show)
		return (
			<HomeDraggableLayer cardKey='navCard' x={position.x} y={position.y} width={styles.width} height={styles.height}>
				<Card
					order={styles.order}
					width={size.width}
					height={size.height}
					x={position.x}
					y={position.y}
					className={clsx(form != 'full' && 'overflow-hidden', form === 'mini' && 'p-3', form === 'icons' && 'flex items-center gap-6 p-3')}>
					{form === 'full' && siteContent.enableChristmas && (
						<>
							<img
								src='/images/christmas/snow-4.webp'
								alt='Christmas decoration'
								className='pointer-events-none absolute'
								style={{ width: 160, left: -18, top: -20, opacity: 0.9 }}
							/>
						</>
					)}

					<Link className='flex items-center gap-3' href='/'>
						<div className='h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-white/45' style={{ boxShadow: '0 12px 20px -5px #E2D9CE' }}>
							<img
								src='/images/avatar.png'
								alt='avatar'
								className='h-full w-full object-cover'
								onError={event => {
									event.currentTarget.style.display = 'none'
								}}
							/>
						</div>
						{form === 'full' && <span className='font-averia mt-1 text-2xl leading-none font-medium'>{siteContent.meta.title}</span>}
					</Link>

					{(form === 'full' || form === 'icons') && (
						<>
							{form !== 'icons' && <div className='text-secondary mt-6 text-sm'>文章分类</div>}

							<div className={cn('relative mt-2 space-y-2', form === 'icons' && 'mt-0 flex items-center gap-6 space-y-0')}>
								<motion.div
									className='absolute max-w-[230px] rounded-full border'
									layoutId='nav-hover'
									initial={false}
									animate={
										form === 'icons'
											? {
													left: hoveredIndex * (itemHeight + 24) - extraSize,
													top: -extraSize,
													width: itemHeight + extraSize * 2,
													height: itemHeight + extraSize * 2
												}
											: { top: hoveredIndex * (itemHeight + 8), left: 0, width: '100%', height: itemHeight }
									}
									transition={{
										type: 'spring',
										stiffness: 400,
										damping: 30
									}}
									style={{ backgroundImage: 'linear-gradient(to right bottom, var(--color-border) 60%, var(--color-card) 100%)' }}
								/>

								{list.map((item, index) => (
									<Link
										key={item.href}
										href={item.href}
										className={cn('text-secondary text-md relative z-10 flex items-center gap-3 rounded-full px-5 py-3', form === 'icons' && 'p-0')}
										onMouseEnter={() => setHoveredIndex(index)}>
										<div className='flex h-7 w-7 items-center justify-center'>
											{hoveredIndex == index ? <item.iconActive className='text-brand absolute h-7 w-7' /> : <item.icon className='absolute h-7 w-7' />}
										</div>
										{form !== 'icons' && (
											<>
												<span className={clsx(index == hoveredIndex && 'text-primary font-medium')}>{item.label}</span>
												<span className='text-secondary ml-auto text-xs'>
													{index === 0 ? items.length : articleCountByCategory.get(item.label) || 0}
												</span>
											</>
										)}
									</Link>
								))}
							</div>
						</>
					)}
				</Card>
			</HomeDraggableLayer>
		)
}
