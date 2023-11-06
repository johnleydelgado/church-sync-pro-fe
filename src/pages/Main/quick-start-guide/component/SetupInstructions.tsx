import { setTabSettings } from '@/redux/common'
import { AccordionBody } from '@material-tailwind/react'
import React from 'react'
import { useDispatch } from 'react-redux'

interface StepProps {
  number: number
  content: string
  linkText?: string
  link?: string
}

const Step: React.FC<StepProps> = ({ number, content, linkText, link }) => {
  const dispatch = useDispatch()
  const handleLinkClick = (link: string) => {
    // Define logic to determine which action to dispatch based on the link
    if (link === '/settings?tab=3') {
      dispatch(
        setTabSettings({
          account: false,
          billing: false,
          connect: true,
          bookkeeper: false,
        }),
      )
    } else if (link === '/settings?tab=1') {
      dispatch(
        setTabSettings({
          account: true,
          billing: false,
          connect: false,
          bookkeeper: false,
        }),
      )
    } else if (link === '/settings?tab=4') {
      dispatch(
        setTabSettings({
          account: false,
          billing: false,
          connect: false,
          bookkeeper: true,
        }),
      )
    }
    // Add more conditions as needed for other links
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
            onClick={() => handleLinkClick(link)}
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
  headerLink,
  steps,
}) => {
  return (
    <AccordionBody className="rounded-lg p-4 w-full pl-28 text-md">
      <div className="mb-4">
        {header}{' '}
        {/* {headerLink && (
          <a href={headerLink} className="text-blue-500">
            Settings
          </a>
        )} */}
      </div>
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
