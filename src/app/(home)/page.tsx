'use client'

import HiCard from '@/app/(home)/hi-card'
import TechStackCard from '@/app/(home)/tech-stack-card'
import ClockCard from '@/app/(home)/clock-card'
import CalendarCard from '@/app/(home)/calendar-card'
import SocialButtons from '@/app/(home)/social-buttons'
import AritcleCard from '@/app/(home)/aritcle-card'
import SearchCard from '@/app/(home)/search-card'
import SnowfallBackground from '@/layout/backgrounds/snowfall'
import { useSize } from '@/hooks/use-size'
import HatCard from './hat-card'
import BeianCard from './beian-card'
import { useConfigStore } from './stores/config-store'

export default function Home() {
	const { maxSM } = useSize()
	const { cardStyles, siteContent } = useConfigStore()

	return (
		<>
			{siteContent.enableChristmas && <SnowfallBackground zIndex={0} count={!maxSM ? 125 : 20} />}

			<div className='max-sm:flex max-sm:flex-col max-sm:items-center max-sm:gap-6 max-sm:pt-28 max-sm:pb-20'>
				{maxSM ? (
					<>
						{cardStyles.hiCard?.enabled !== false && <HiCard />}
						{cardStyles.categoryCard?.enabled !== false && <SearchCard />}
						{cardStyles.articleCard?.enabled !== false && <AritcleCard />}
						{cardStyles.techStackCard?.enabled !== false && <TechStackCard />}
						{cardStyles.socialButtons?.enabled !== false && <SocialButtons />}
					</>
				) : (
					<>
						{cardStyles.techStackCard?.enabled !== false && <TechStackCard />}
						{cardStyles.hiCard?.enabled !== false && <HiCard />}
						{cardStyles.clockCard?.enabled !== false && <ClockCard />}
						{cardStyles.calendarCard?.enabled !== false && <CalendarCard />}
						{cardStyles.socialButtons?.enabled !== false && <SocialButtons />}
						{cardStyles.categoryCard?.enabled !== false && <SearchCard />}
						{cardStyles.articleCard?.enabled !== false && <AritcleCard />}
						{cardStyles.hatCard?.enabled !== false && <HatCard />}
						{cardStyles.beianCard?.enabled !== false && <BeianCard />}
					</>
				)}
			</div>

			{siteContent.enableChristmas && <SnowfallBackground zIndex={2} count={!maxSM ? 125 : 20} />}
		</>
	)
}
