import React from 'react'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Typography,
} from '@material-tailwind/react'
import { Item } from './constant'

interface CardItemProps {
  className?: string
  item: Item
  buyNow?: () => void
  index?: number
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      stroke="currentColor"
      className="h-3 w-3"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  )
}

const CardItem: React.FC<CardItemProps> = ({
  className = '',
  item,
  buyNow,
  index,
}) => (
  <Card
    color="light-blue"
    variant="gradient"
    className={`w-full md:w-1/2 lg:max-w-[20rem] p-4 lg:p-8 transition-all duration-300 ease-in-out cursor-pointer ${className} 
    }`}
  >
    <CardHeader
      floated={false}
      shadow={false}
      color="transparent"
      className="transition-all duration-300 ease-in-out m-0 mb-4 lg:mb-8 rounded-none border-b border-white/10 pb-4 lg:pb-8 text-center"
    >
      <Typography
        variant="small"
        color="white"
        className="transition-all duration-300 ease-in-out font-normal uppercase"
      >
        {item.title}
      </Typography>
      <Typography
        variant="h1"
        color="white"
        className="transition-all duration-300 ease-in-out mt-3 lg:mt-6 flex justify-center gap-1 text-5xl lg:text-7xl font-normal"
      >
        <span className="transition-all duration-300 ease-in-out text-3xl lg:text-4xl">
          $
        </span>
        {item.price}{' '}
        <span className="transition-all duration-300 ease-in-out self-end text-3xl lg:text-4xl">
          /{!index ? '' : index === 1 ? 'mo' : 'yr'}
        </span>
      </Typography>
    </CardHeader>
    <CardBody className="transition-all duration-300 ease-in-out p-0">
      <ul className="flex flex-col gap-2 lg:gap-4">
        {/* List items with transitions */}
        <li className="transition-all duration-300 ease-in-out flex items-center gap-2 lg:gap-4">
          <span className="transition-all duration-300 ease-in-out rounded-full border border-white/20 bg-white/20 p-1">
            <CheckIcon />
          </span>
          <Typography className="transition-all duration-300 ease-in-out font-normal">
            5 team members
          </Typography>
        </li>
        <li className="flex items-center gap-4">
          <span className="rounded-full border border-white/20 bg-white/20 p-1">
            <CheckIcon />
          </span>
          <Typography className="font-normal">200+ components</Typography>
        </li>
        <li className="flex items-center gap-4">
          <span className="rounded-full border border-white/20 bg-white/20 p-1">
            <CheckIcon />
          </span>
          <Typography className="font-normal">40+ built-in pages</Typography>
        </li>
        <li className="flex items-center gap-4">
          <span className="rounded-full border border-white/20 bg-white/20 p-1">
            <CheckIcon />
          </span>
          <Typography className="font-normal">1 year free updates</Typography>
        </li>
        <li className="flex items-center gap-4">
          <span className="rounded-full border border-white/20 bg-white/20 p-1">
            <CheckIcon />
          </span>
          <Typography className="font-normal">
            Life time technical support
          </Typography>
        </li>
        {/* Add other list items with similar transition classes */}
      </ul>
    </CardBody>
    <CardFooter className="transition-all duration-300 ease-in-out mt-8 lg:mt-12 p-0">
      <Button
        size="lg"
        color="white"
        className="transition-transform duration-300 ease-in-out hover:scale-[1.02] focus:scale-[1.02] active:scale-100"
        ripple={false}
        fullWidth={true}
        onClick={buyNow}
      >
        Buy Now
      </Button>
    </CardFooter>
  </Card>
)

export { CardItem }
