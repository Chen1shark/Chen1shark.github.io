import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useBlogIndex } from '@/hooks/use-blog-index'
import { useConfigStore } from './stores/config-store'
import { CARD_SPACING } from '@/consts'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { cn } from '@/lib/utils'
import { HomeDraggableLayer } from './home-draggable-layer'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

dayjs.locale('zh-cn')

export default function CalendarCard() {
	const center = useCenterStore()
	const { cardStyles, siteContent } = useConfigStore()
	const { items } = useBlogIndex()
	const now = dayjs()
	const [visibleMonth, setVisibleMonth] = useState(() => now.startOf('month'))
	const isCurrentMonth = visibleMonth.isSame(now, 'month')
	const currentDate = now.date()
	const firstDayOfMonth = visibleMonth.startOf('month')
	const firstDayWeekday = (firstDayOfMonth.day() + 6) % 7
	const daysInMonth = visibleMonth.daysInMonth()
	const currentWeekday = (now.day() + 6) % 7
	const styles = cardStyles.calendarCard
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardStyles.width / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardStyles.offset + CARD_SPACING
	const blogsByDate = useMemo(() => {
		const result = new Set<string>()
		for (const item of items) {
			const key = dayjs(item.date).format('YYYY-MM-DD')
			result.add(key)
		}
		return result
	}, [items])

	return (
		<HomeDraggableLayer cardKey='calendarCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='flex flex-col'>
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-7.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 150, right: -12, top: -12, opacity: 0.8 }}
						/>
					</>
				)}

				<div className='flex items-center justify-between'>
					<h3 className='text-secondary text-sm'>{visibleMonth.format('YYYY/M')}</h3>
					<div className='flex items-center gap-1'>
						<button
							type='button'
							onClick={() => setVisibleMonth(month => month.subtract(1, 'month'))}
							aria-label='上个月'
							className='grid h-7 w-7 place-items-center rounded-lg transition-colors hover:bg-white/60'>
							<ChevronLeft className='text-secondary h-4 w-4' />
						</button>
						<button
							type='button'
							onClick={() => setVisibleMonth(now.startOf('month'))}
							className='text-secondary rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/60'>
							今天
						</button>
						<button
							type='button'
							onClick={() => setVisibleMonth(month => month.add(1, 'month'))}
							aria-label='下个月'
							className='grid h-7 w-7 place-items-center rounded-lg transition-colors hover:bg-white/60'>
							<ChevronRight className='text-secondary h-4 w-4' />
						</button>
					</div>
				</div>
				<ul className={cn('text-secondary mt-3 grid h-[206px] flex-1 grid-cols-7 gap-2 text-sm', (styles.height < 240 || styles.width < 240) && 'text-xs')}>
					{new Array(7).fill(0).map((_, index) => {
						const isCurrentWeekday = index === currentWeekday
						return (
							<li key={index} className={cn('flex items-center justify-center font-medium', isCurrentWeekday && 'text-brand')}>
								{dates[index]}
							</li>
						)
					})}

					{new Array(firstDayWeekday).fill(0).map((_, index) => (
						<li key={`empty-${index}`} />
					))}

					{new Array(daysInMonth).fill(0).map((_, index) => {
						const day = index + 1
						const isToday = isCurrentMonth && day === currentDate
						const dateKey = visibleMonth.date(day).format('YYYY-MM-DD')
						const hasBlog = blogsByDate.has(dateKey)
						if (hasBlog) {
							return (
								<li key={day} className='flex items-center justify-center'>
									<Link
										href={`/blog?date=${dateKey}`}
										aria-label={`${day}日的文章`}
										title={`${dateKey} 的文章`}
										className={cn(
											'relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/70 hover:text-brand',
											isToday && 'bg-linear border font-medium',
											!isToday && 'font-medium text-brand'
										)}
									>
										{day}
										<span className='absolute bottom-1 h-1 w-1 rounded-full bg-current' />
									</Link>
								</li>
							)
						}
						return (
							<li key={day} className={cn('flex items-center justify-center rounded-lg', isToday && 'bg-linear border font-medium')}>
								{day}
							</li>
						)
					})}
				</ul>
			</Card>
		</HomeDraggableLayer>
	)
}

const dates = ['一', '二', '三', '四', '五', '六', '日']
