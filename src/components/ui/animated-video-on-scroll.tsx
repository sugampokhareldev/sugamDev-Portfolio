// animated-video-on-scroll.tsx
//
// NOTE FOR THIS CODEBASE (Astro, not Next.js):
//   - 'use client' below is a Next.js App Router directive. It is inert in
//     Astro and kept only so the file matches upstream. Hydration is decided
//     at the call site instead: <HeroVideoDemo client:visible />. Without a
//     client:* directive this renders as static HTML and no scroll animation
//     will run.
//   - These are compound components sharing one scroll progress value through
//     context, so the whole tree must hydrate as a single React island. Put
//     the client:* directive on the outermost component, never on the parts.
'use client'

import * as React from 'react'
import {
  type HTMLMotionProps,
  type MotionValue,
  type Variants,
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from 'motion/react'

import { cn } from '@/lib/utils'

interface ContainerScrollContextValue {
  scrollYProgress: MotionValue<number>
}

interface ContainerInsetProps extends HTMLMotionProps<'div'> {
  insetYRange?: [number, number]
  insetXRange?: [number, number]
  roundednessRange?: [number, number]
}

// `as const` matters: without it TypeScript widens `type` to `string`, which
// does not satisfy motion's Transition union.
const SPRING_TRANSITION_CONFIG = {
  type: 'spring',
  stiffness: 100,
  damping: 16,
  mass: 0.75,
  restDelta: 0.005,
} as const

const variants: Variants = {
  hidden: {
    filter: 'blur(10px)',
    opacity: 0,
  },
  visible: {
    filter: 'blur(0px)',
    opacity: 1,
  },
}

const ContainerScrollContext = React.createContext<
  ContainerScrollContextValue | undefined
>(undefined)

function useContainerScrollContext() {
  const context = React.useContext(ContainerScrollContext)
  if (!context) {
    throw new Error(
      'useContainerScrollContext must be used within a ContainerScroll Component'
    )
  }
  return context
}

/**
 * The scroll track. Its height is what the animation is scrubbed against, so
 * give it a tall class (e.g. `h-[350vh]`) — a short track means the whole
 * effect plays out in a few pixels of scrolling.
 */
export const ContainerScroll: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ children, className, ...props }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ['start center', 'end end'],
  })

  return (
    <ContainerScrollContext.Provider value={{ scrollYProgress }}>
      <div
        ref={scrollRef}
        className={cn('relative min-h-svh w-full', className)}
        {...props}
      >
        {children}
      </div>
    </ContainerScrollContext.Provider>
  )
}
ContainerScroll.displayName = 'ContainerScroll'

interface ContainerAnimatedProps extends HTMLMotionProps<'div'> {
  inputRange?: number[]
  outputRange?: number[]
}

export const ContainerAnimated = React.forwardRef<
  HTMLDivElement,
  ContainerAnimatedProps
>(
  (
    {
      className,
      transition,
      style,
      inputRange = [0.2, 0.8],
      outputRange = [80, 0],
      ...props
    },
    ref
  ) => {
    const { scrollYProgress } = useContainerScrollContext()
    const y = useTransform(scrollYProgress, inputRange, outputRange)
    return (
      <motion.div
        ref={ref}
        className={cn('', className)}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        style={{ y, ...style }}
        transition={{ ...SPRING_TRANSITION_CONFIG, ...transition }}
        {...props}
      />
    )
  }
)
ContainerAnimated.displayName = 'ContainerAnimated'

export const ContainerSticky = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('sticky left-0 top-0 min-h-svh w-full', className)}
      {...props}
    />
  )
})
ContainerSticky.displayName = 'ContainerSticky'

export const HeroVideo = React.forwardRef<
  HTMLVideoElement,
  HTMLMotionProps<'video'>
>(({ style, className, transition, ...props }, ref) => {
  const { scrollYProgress } = useContainerScrollContext()
  const scale = useTransform(scrollYProgress, [0, 0.8], [0.7, 1])

  return (
    <motion.video
      ref={ref}
      className={cn('relative z-10 size-auto max-h-full max-w-full', className)}
      autoPlay
      muted
      loop
      playsInline
      style={{ scale, ...style }}
      {...props}
    />
  )
})
HeroVideo.displayName = 'HeroVideo'

export const HeroButton = React.forwardRef<
  HTMLButtonElement,
  HTMLMotionProps<'button'>
>(({ className, transition, ...props }, ref) => {
  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      ref={ref}
      className={cn(
        'group relative flex w-fit items-center rounded-full border border-[#84cc16] bg-gray-950/10 px-4 py-2 shadow-[0px_4px_24px_#84cc16] transition-colors hover:bg-slate-950/50',
        className
      )}
      {...props}
    />
  )
})
HeroButton.displayName = 'HeroButton'

/**
 * Reveals its children by animating a `clip-path: inset(...)` from a small
 * rounded pill out to the full frame. It is `pointer-events-none`, so put
 * anything clickable outside it.
 */
export const ContainerInset = React.forwardRef<
  HTMLDivElement,
  ContainerInsetProps
>(
  (
    {
      className,
      style,
      insetYRange = [45, 0],
      insetXRange = [45, 0],
      roundednessRange = [1000, 16],
      transition,
      ...props
    },
    ref
  ) => {
    const { scrollYProgress } = useContainerScrollContext()

    const insetY = useTransform(scrollYProgress, [0, 0.8], insetYRange)
    const insetX = useTransform(scrollYProgress, [0, 0.8], insetXRange)
    const roundedness = useTransform(scrollYProgress, [0, 1], roundednessRange)

    const clipPath = useMotionTemplate`inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${roundedness}px)`

    return (
      <motion.div
        ref={ref}
        className={cn('relative pointer-events-none overflow-hidden', className)}
        style={{ clipPath, ...style }}
        {...props}
      />
    )
  }
)
ContainerInset.displayName = 'ContainerInset'
