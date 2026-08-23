import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { getUserRelated } from '@/common/api/user'
import { useQuery } from 'react-query'
import { isEmpty } from 'lodash'
import { AiOutlineQuestionCircle } from 'react-icons/ai'
import { useGetTokenList } from '@/common/hooks/useGetTokenList'
import { ASK_US_DATA, INSTRUCTIONS } from './contant/AskUsData'
import AccordionAskUs from './component/AccordionAskUs'

interface BookkeeperProps {}

// Number of required (non-optional) onboarding steps shown first.
const CORE_STEP_COUNT = 4

const QuickStartGuide: FC<BookkeeperProps> = ({}) => {
  const user = useSelector((state: RootState) => state.common.user)
  const bookkeeper = useSelector((state: RootState) => state.common.bookkeeper)

  const [open, setOpen] = React.useState<number | null>(null)
  const handleOpen = (value: number) =>
    setOpen(open === value ? null : value)

  const { tokenList } = useGetTokenList()

  const { data: userData } = useQuery(
    ['quickStartUserRelated', user, bookkeeper],
    async () => {
      const email =
        user.role === 'bookkeeper'
          ? bookkeeper?.clientEmail || ''
          : user.email
      if (email) {
        const res = await getUserRelated(email)
        return res.data
      }
    },
    {
      refetchOnWindowFocus: false,
      enabled: !!user,
    },
  )

  const tokens = tokenList?.[0]?.tokens || []
  const userSetting = userData?.UserSetting

  // Step 1 — Planning Center + QuickBooks both connected.
  const isAccountsConnected =
    !!tokens.find((t) => t.token_type === 'pco') &&
    !!tokens.find((t) => t.token_type === 'qbo')

  // Step 2 — at least one fund mapping saved.
  const isFundsMapped = !isEmpty(userSetting?.settingsData)

  // Step 3 — both clearing/bank account and fee account configured.
  const isBankConfigured =
    !isEmpty(userSetting?.settingBankData) &&
    !isEmpty(userSetting?.settingBankCharges)

  // Step 4 — daily auto-sync turned on.
  const isAutoSyncOn = !!userSetting?.isAutomationEnable

  const doneStates = [
    isAccountsConnected,
    isFundsMapped,
    isBankConfigured,
    isAutoSyncOn,
  ]

  const completedCount = doneStates.filter(Boolean).length

  return (
    <MainLayout removePadding>
      <div className="flex h-full gap-4">
        <div className="rounded-lg p-8 bg-white w-screen">
          {/* Header */}
          <div className="pb-2">
            <div className="flex flex-col border-b-2 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AiOutlineQuestionCircle size={48} className="text-yellow" />
                  <span className="font-bold text-4xl text-yellow">
                    Quick Start Guide
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-500">
                  {completedCount} of {CORE_STEP_COUNT} complete
                </span>
              </div>
            </div>
          </div>

          {/* BODY — required steps */}
          {ASK_US_DATA.slice(0, CORE_STEP_COUNT).map((a, index) => (
            <AccordionAskUs
              isOpen={open === index}
              index={index}
              handleOpen={() => handleOpen(index)}
              key={index}
              bgColor={index % 2 === 0 ? 'bg-[#E5F2F8]' : 'bg-white'}
              bodyTitleArr={INSTRUCTIONS[index]}
              done={doneStates[index]}
              {...a}
            />
          ))}

          {/* Optional steps */}
          {ASK_US_DATA.length > CORE_STEP_COUNT && (
            <>
              <div className="pt-6 pb-2">
                <span className="font-bold text-lg text-gray-500">
                  Optional
                </span>
              </div>
              {ASK_US_DATA.slice(CORE_STEP_COUNT).map((a, i) => {
                const index = CORE_STEP_COUNT + i
                return (
                  <AccordionAskUs
                    isOpen={open === index}
                    index={index}
                    handleOpen={() => handleOpen(index)}
                    key={index}
                    bgColor={index % 2 === 0 ? 'bg-[#E5F2F8]' : 'bg-white'}
                    bodyTitleArr={INSTRUCTIONS[index]}
                    {...a}
                  />
                )
              })}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default QuickStartGuide
