import { Accordion, AccordionHeader } from '@material-tailwind/react'
import { FC } from 'react'
import { AiOutlineMinusCircle } from 'react-icons/ai'
import { HiPlus } from 'react-icons/hi'
import SetupInstructions from './SetupInstructions'

interface AccordionProps {
  handleOpen: (value: any) => void // Function which takes a value and doesn't return anything
  isOpen: boolean
  headerTitle: string
  bodyTitleArr: any
  bgColor: string
  index: number
}

const renderBoldLastWord = (text: string) => {
  const words = text.split(' ')
  const lastWord = words.pop()
  return (
    <>
      {words.join(' ')} <strong className="pl-4">{lastWord}</strong>
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
}) => {
  return (
    <Accordion open={isOpen}>
      <div
        className={`flex justify-between px-8 py-6 bg-[${bgColor}] items-center cursor-pointer`}
        onClick={() => handleOpen(index)}
      >
        <div className="flex gap-4 items-center">
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
