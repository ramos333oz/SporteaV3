import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"

const CarouselContext = React.createContext(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }
  return context
}

function Carousel({ className, children, ...props }) {
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)
  const carouselRef = React.useRef(null)

  const scrollPrev = React.useCallback(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: 'smooth' })
    }
  }, [])

  const scrollNext = React.useCallback(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' })
    }
  }, [])

  const checkScrollButtons = React.useCallback(() => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
      setCanScrollPrev(scrollLeft > 0)
      setCanScrollNext(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }, [])

  React.useEffect(() => {
    const carousel = carouselRef.current
    if (carousel) {
      checkScrollButtons()
      carousel.addEventListener('scroll', checkScrollButtons)
      return () => carousel.removeEventListener('scroll', checkScrollButtons)
    }
  }, [checkScrollButtons])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div className={cn("relative", className)} {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }) {
  const { carouselRef } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className={cn(
        "flex overflow-x-auto scrollbar-hide gap-4 pb-4",
        className
      )}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      {...props}
    />
  )
}

function CarouselItem({ className, ...props }) {
  return (
    <div
      className={cn("min-w-0 shrink-0", className)}
      {...props}
    />
  )
}

function CarouselPrevious({ className, ...props }) {
  const { scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full",
        !canScrollPrev && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({ className, ...props }) {
  const { scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full",
        !canScrollNext && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
