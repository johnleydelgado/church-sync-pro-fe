import { Accordion, AccordionHeader } from '@material-tailwind/react'
import { FC } from 'react'
import { AiOutlineMinusCircle } from 'react-icons/ai'
import { BsCheckCircleFill, BsCircle } from 'react-icons/bs'
import { HiPlus } from 'react-icons/hi'
import SetupInstructions from './SetupInstructions'

interface AccordionProps {
  handleOpen: (value: any) => void // Function which takes a value and doesn't return anything
  isOpen: boolean
  headerTitle: string
  bodyTitleArr: any
  bgColor: string
  index: number
  done?: boolean
}

const renderBoldLastWord = (text: string) => {
  const words = text.split(' ')
  const lastWord = words.pop()
  return (
    <>
      {words.join(' ')} <strong className="pl-2">{lastWord}</strong>
    </>
  )
}

const AccordionAskUs: FC<AccordionProps> = ({
  handleOpen,
  isOpen,
  headerTitle,
  bodyTitleArr,
  bgColor,
  index,
  done = false,
}) => {
  return (
    <Accordion open={isOpen}>
      <div
        className={`flex justify-between px-8 py-6 ${bgColor} items-center cursor-pointer`}
        onClick={() => handleOpen(index)}
      >
        <div className="flex gap-4 items-center">
          {done ? (
            <BsCheckCircleFill
              size={22}
              className="text-green-500 shrink-0"
              title="Completed"
            />
          ) : (
            <BsCircle
              size={22}
              className="text-gray-300 shrink-0"
              title="Not yet complete"
            />
          )}
          <p className="w-20 text-gray-400">STEP {index + 1}</p>
          <AccordionHeader
            onClick={() => handleOpen(index)}
            className="border-0 p-0 font-thin justify-start"
          >
            {renderBoldLastWord(headerTitle)}
          </AccordionHeader>
        </div>
        <div>
          {isOpen ? (
            <AiOutlineMinusCircle
              className="text-right"
              onClick={() => handleOpen(index)}
            />
          ) : (
            <HiPlus className="text-right" onClick={() => handleOpen(index)} />
          )}
        </div>
      </div>

      {bodyTitleArr ? <SetupInstructions {...bodyTitleArr} /> : null}
    </Accordion>
  )
}

export default AccordionAskUs
