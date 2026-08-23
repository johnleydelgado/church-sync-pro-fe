import { AccordionBody } from '@material-tailwind/react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

interface StepProps {
  number: number
  content: string
  linkText?: string
  link?: string
}

const Step: React.FC<StepProps> = ({ number, content, linkText, link }) => {
  const navigate = useNavigate()

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    link: string,
  ) => {
    // Client-side navigate to the current routes instead of a full reload
    e.preventDefault()
    navigate(link)
  }

  return (
    <div className="flex">
      <span className="mr-2 text-blue-500">{number}.</span>
      {linkText && link ? (
        <span>
          {content}
          <a
            href={link}
            className="text-blue-500 ml-1"
            onClick={(e) => handleLinkClick(e, link)}
          >
            {linkText}
          </a>
        </span>
      ) : (
        <span>{content}</span>
      )}
    </div>
  )
}

type StepData =
  | string
  | {
      text: string
      linkText?: string
      link?: string
    }

interface SetupInstructionsProps {
  header: string
  headerLink?: string
  steps: StepData[]
}

const SetupInstructions: React.FC<SetupInstructionsProps> = ({
  header,
  steps,
}) => {
  return (
    <AccordionBody className="rounded-lg p-4 w-full pl-28 text-md">
      <div className="mb-4">{header}</div>
      <div>
        {steps.map((step, index) => {
          if (typeof step === 'string') {
            return <Step key={index} number={index + 1} content={step} />
          } else {
            return (
              <Step
                key={index}
                number={index + 1}
                content={step.text}
                linkText={step.linkText}
                link={step.link}
              />
            )
          }
        })}
      </div>
    </AccordionBody>
  )
}

export default SetupInstructions
