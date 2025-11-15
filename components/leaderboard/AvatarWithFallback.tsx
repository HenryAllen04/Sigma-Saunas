"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export type AvatarWithFallbackProps = {
	className?: string
	src: string
	alt: string
	fallbackText: string
	ringClassName?: string
}

export function AvatarWithFallback(props: AvatarWithFallbackProps) {
	const { className, src, alt, fallbackText, ringClassName } = props
	const [currentSrc, setCurrentSrc] = React.useState(src)
	const [attempt, setAttempt] = React.useState(0)

	const handleError = React.useCallback(() => {
		// Try common alternative extensions to handle mismatched filename types
		if (attempt >= 4) return
		const nextSrc = (() => {
			if (currentSrc.endsWith(".png")) return currentSrc.replace(/\.png$/i, ".jpg")
			if (currentSrc.endsWith(".jpg")) return currentSrc.replace(/\.jpg$/i, ".jpeg")
			if (currentSrc.endsWith(".jpeg")) return currentSrc.replace(/\.jpeg$/i, ".webp")
			if (currentSrc.endsWith(".webp")) return currentSrc.replace(/\.webp$/i, ".png")
			// If no (recognized) extension, try .png first
			return `${currentSrc}.png`
		})()
		setAttempt((a) => a + 1)
		setCurrentSrc(nextSrc)
	}, [attempt, currentSrc])

	return (
		<Avatar className={cn("h-8 w-8 ring-1 ring-white/10", className, ringClassName)}>
			<AvatarImage src={currentSrc} alt={alt} onError={handleError} />
			<AvatarFallback>{fallbackText}</AvatarFallback>
		</Avatar>
	)
}


