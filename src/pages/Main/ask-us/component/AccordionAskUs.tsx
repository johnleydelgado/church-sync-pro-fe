import {
  Accordion,
  AccordionBody,
  AccordionHeader,
} from '@material-tailwind/react'
import React, { FC } from 'react'
import { AiOutlineMinusCircle } from 'react-icons/ai'
import { HiPlus } from 'react-icons/hi'

interface AccordionProps {
  handleOpen: (value: any) => void // Function which takes a value and doesn't return anything
  isOpen: boolean
  headerTitle: string
  bodyTitle: string
  bgColor: string
}
const AccordionAskUs: FC<AccordionProps> = ({
  handleOpen,
  isOpen,
  headerTitle,
  bodyTitle,
  bgColor,
}) => {
  return (
    <Accordion
      open={isOpen}
      icon={isOpen ? <AiOutlineMinusCircle /> : <HiPlus />}
    >
      <AccordionHeader onClick={handleOpen} className={`p-8 bg-[${bgColor}]`}>
        {headerTitle}
      </AccordionHeader>
      <AccordionBody className={`p-8 bg-[${bgColor}] font-semibold`}>
        {bodyTitle}
      </AccordionBody>
    </Accordion>
  )
}

export default AccordionAskUs
