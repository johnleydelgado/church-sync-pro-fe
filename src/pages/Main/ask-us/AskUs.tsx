import MainLayout from '@/common/components/main-layout/MainLayout'
import React, { FC } from 'react'
import Lottie from 'lottie-react'
import empty from '@/common/assets/empty.json'
import { useDispatch } from 'react-redux'
import { OPEN_MODAL } from '@/redux/common'
import { MODALS_NAME } from '@/common/constant/modal'
import { useQuery } from 'react-query'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { bookkeeperList } from '@/common/api/user'
import { isEmpty } from 'lodash'
import Loading from '@/common/components/loading/Loading'
import { HiOutlineUsers, HiPlus } from 'react-icons/hi'
import { BsPersonAdd } from 'react-icons/bs'
import { AiOutlineQuestionCircle } from 'react-icons/ai'
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
} from '@material-tailwind/react'
import { ASK_US_DATA } from './contant/AskUsData'
import AccordionAskUs from './component/AccordionAskUs'
import { Link } from 'react-router-dom'

interface BookkeeperProps {}

const AskUs: FC<BookkeeperProps> = ({}) => {
  const dispatch = useDispatch()
  const openModal = () => {
    dispatch(OPEN_MODAL(MODALS_NAME.invitation))
  }
  const user = useSelector((state: RootState) => state.common.user)

  const [open, setOpen] = React.useState(null)

  const handleOpen = (value: any) => setOpen(open === value ? 0 : value)

  return (
    <MainLayout>
      <div className="flex h-full gap-4">
        <div className="rounded-lg p-8 bg-white w-screen">
          {/* Header */}
          <div className="pb-2">
            <div className="flex flex-col border-b-2 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AiOutlineQuestionCircle
                    size={48}
                    className="text-[#FAB400]"
                  />
                  <span className="font-bold text-4xl text-[#FAB400]">
                    Ask Us
                  </span>
                </div>
                <Link
                  to="http://churchsyncpro.com"
                  className="text-[#27A1DB] text-lg"
                >
                  Go to help.churchsyncpro.com
                </Link>
              </div>
            </div>
          </div>

          {/* BODY */}

          {ASK_US_DATA.map((a, index) => (
            <AccordionAskUs
              isOpen={open === index}
              handleOpen={() => handleOpen(index)}
              key={index}
              bgColor={index % 2 === 0 ? '#E5F2F8' : 'white'}
              {...a}
            />
          ))}

          {/* <Accordion open={open === 1} icon={<HiPlus />}>
            <AccordionHeader
              onClick={() => handleOpen(1)}
              className="p-8 bg-[#E5F2F8]"
            >
              What does your accounting software do?
            </AccordionHeader>
            <AccordionBody>
              We&apos;re not always in the position that we want to be at.
              We&apos;re constantly growing. We&apos;re constantly making
              mistakes. We&apos;re constantly trying to express ourselves and
              actualize our dreams.
            </AccordionBody>
          </Accordion>
          <Accordion open={open === 2}>
            <AccordionHeader onClick={() => handleOpen(2)}>
              Is your software cloud-based or on-premises?
            </AccordionHeader>
            <AccordionBody>
              We&apos;re not always in the position that we want to be at.
              We&apos;re constantly growing. We&apos;re constantly making
              mistakes. We&apos;re constantly trying to express ourselves and
              actualize our dreams.
            </AccordionBody>
          </Accordion>
          <Accordion open={open === 3}>
            <AccordionHeader onClick={() => handleOpen(3)}>
              Does your software support multiple currencies and international
              transactions?
            </AccordionHeader>
            <AccordionBody>
              We&apos;re not always in the position that we want to be at.
              We&apos;re constantly growing. We&apos;re constantly making
              mistakes. We&apos;re constantly trying to express ourselves and
              actualize our dreams.
            </AccordionBody>
          </Accordion>

          <Accordion open={open === 4}>
            <AccordionHeader onClick={() => handleOpen(3)}>
              What kind of customer support and training do you provide for new
              users?
            </AccordionHeader>
            <AccordionBody>
              We&apos;re not always in the position that we want to be at.
              We&apos;re constantly growing. We&apos;re constantly making
              mistakes. We&apos;re constantly trying to express ourselves and
              actualize our dreams.
            </AccordionBody>
          </Accordion>

          <Accordion open={open === 5}>
            <AccordionHeader onClick={() => handleOpen(3)}>
              What kind of data backup and disaster recovery options are
              available?
            </AccordionHeader>
            <AccordionBody>
              We&apos;re not always in the position that we want to be at.
              We&apos;re constantly growing. We&apos;re constantly making
              mistakes. We&apos;re constantly trying to express ourselves and
              actualize our dreams.
            </AccordionBody>
          </Accordion>

          <Accordion open={open === 5}>
            <AccordionHeader onClick={() => handleOpen(3)}>
              How do you handle software bugs and customer feedback?
            </AccordionHeader>
            <AccordionBody>
              We&apos;re not always in the position that we want to be at.
              We&apos;re constantly growing. We&apos;re constantly making
              mistakes. We&apos;re constantly trying to express ourselves and
              actualize our dreams.
            </AccordionBody>
          </Accordion> */}
        </div>
      </div>
    </MainLayout>
  )
}

export default AskUs
