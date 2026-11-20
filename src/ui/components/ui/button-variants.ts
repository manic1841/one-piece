import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow,transform] duration-fast ease-out-quint active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'border border-negative bg-transparent text-negative hover:bg-negative hover:text-background',
        outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        text: 'border border-transparent bg-transparent text-muted-foreground hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        // The visible box stays 40px so toolbar rhythm holds; the `after` layer
        // is a pseudo-element, so it enlarges the hit area to 44px without
        // moving a single pixel of layout (states-and-a11y §命中區).
        icon: 'relative h-10 w-10 after:absolute after:-inset-0.5 after:content-[""]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
