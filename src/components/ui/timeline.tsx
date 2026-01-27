import { cn } from "@/lib/utils";
import React from "react";

const Timeline = React.forwardRef<HTMLOListElement, React.HTMLAttributes<HTMLOListElement>>(({ className, ...props }, ref) => (
  <ol ref={ref} className={cn("flex flex-col", className)} {...props} />
));
Timeline.displayName = "Timeline";

const TimelineItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("relative flex flex-col pb-8", className)} {...props} />
));
TimelineItem.displayName = "TimelineItem";

const TimelineConnector = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("absolute left-[9px] top-5 h-full w-0.5 bg-border -translate-x-1/2", className)} {...props} />
));
TimelineConnector.displayName = "TimelineConnector";


const TimelineHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center gap-4", className)} {...props} />
));
TimelineHeader.displayName = "TimelineHeader";

const TimelineIcon = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center justify-center h-5 w-5 rounded-full bg-primary z-10", className)} {...props}>
      <div className="h-2 w-2 rounded-full bg-primary-foreground"></div>
  </div>
));
TimelineIcon.displayName = "TimelineIcon";


const TimelineTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-semibold text-foreground", className)} {...props} />
));
TimelineTitle.displayName = "TimelineTitle";

const TimelineBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pl-[34px] pt-1 text-sm text-muted-foreground", className)} {...props} />
));
TimelineBody.displayName = "TimelineBody";


export { Timeline, TimelineItem, TimelineConnector, TimelineHeader, TimelineIcon, TimelineTitle, TimelineBody };
