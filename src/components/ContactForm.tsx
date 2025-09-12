"use client";

import { Instagram, Facebook } from "lucide-react";
import FadeInOnScroll from "@/components/FadeInOnScroll";
import { useForm } from "react-hook-form";
import { useState } from "react";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
};

const NAME_PATTERN = /^[A-Za-zÀ-ÿ'’.\-\s]+$/;

export default function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();
  const [feedback, setFeedback] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    setFeedback(null);

    // Optional: normalize/trim name fields before sending
    const trimmedFirst = data.firstName.trim().replace(/\s+/g, " ");
    const trimmedLast = data.lastName.trim().replace(/\s+/g, " ");
    setValue("firstName", trimmedFirst);
    setValue("lastName", trimmedLast);

    try {
      const emailRes = await fetch("/api/send-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          firstName: trimmedFirst,
          lastName: trimmedLast,
        }),
      });

      const emailResult = await emailRes.json();

      if (!emailRes.ok) {
        setFeedback(
          emailResult.message ||
            "❌ Failed to send email. Please check your email address."
        );
        return;
      }

      await fetch("/api/messages/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: trimmedFirst,
          last_name: trimmedLast,
          email: data.email,
          message: data.message,
          sender: "customer",
          type: "text",
        }),
      });

      setFeedback("✅ Message sent successfully!");
      reset();
    } catch (err: any) {
      console.error("Contact form error:", err);
      setFeedback("❌ An unexpected error occurred. Please try again later.");
    }
  };

  return (
    <section className="py-20 px-4 bg-[#f5f2e8]">
      <FadeInOnScroll>
        <h2 className="text-4xl font-bold font-playfair text-center text-[#3c2f2f] mb-12 font-['Playfair_Display']">
          Get In Touch
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-w-xl mx-auto space-y-6 font-['Playfair_Display']"
          noValidate
        >
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="First Name"
              aria-invalid={!!errors.firstName || undefined}
              {...register("firstName", {
                required: "First name is required.",
                pattern: {
                  value: NAME_PATTERN,
                  message:
                    "Only letters, spaces, apostrophes, hyphens, and periods allowed.",
                },
              })}
              className="w-1/2 p-4 text-[#3c2f2f] bg-white border border-[#ccc] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 font-garamond transition"
            />
            <input
              type="text"
              placeholder="Last Name"
              aria-invalid={!!errors.lastName || undefined}
              {...register("lastName", {
                required: "Last name is required.",
                pattern: {
                  value: NAME_PATTERN,
                  message:
                    "Only letters, spaces, apostrophes, hyphens, and periods allowed.",
                },
              })}
              className="w-1/2 p-4 text-[#3c2f2f] bg-white border border-[#ccc] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 font-garamond transition"
            />
          </div>
          {(errors.firstName || errors.lastName) && (
            <p className="text-red-500 text-sm">
              {errors.firstName?.message ||
                errors.lastName?.message ||
                "Both first and last name are required."}
            </p>
          )}

          <input
            type="email"
            placeholder="Email"
            aria-invalid={!!errors.email || undefined}
            {...register("email", { required: "Email is required." })}
            className="w-full p-4 text-[#3c2f2f] bg-white border border-[#ccc] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 font-garamond transition"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}

          <textarea
            placeholder="Message"
            rows={5}
            aria-invalid={!!errors.message || undefined}
            {...register("message", { required: "Message is required." })}
            className="w-full p-4 text-[#3c2f2f] bg-white border border-[#ccc] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 font-garamond transition"
          />
          {errors.message && (
            <p className="text-red-500 text-sm">{errors.message.message}</p>
          )}

          {feedback && (
            <p className="text-center text-base font-garamond mt-2 text-[#3c2f2f]">
              {feedback}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#2f5d50] text-white font-medium px-6 py-3 rounded-md hover:bg-[#24493f] transition shadow-md font-garamond"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </form>

        <div className="mt-12 text-center space-y-4">
          <p className="text-[#3c2f2f] font-[Garamond] text-lg">
            Thank you for reaching out to us! We value your feedback and will
            get back to you as soon as possible.
          </p>

          <p className="text-[#3c2f2f] font-[Garamond] text-base text-lg">
            Check us out on our socials!
          </p>

          <div className="flex justify-center gap-4">
            <a
              href="https://www.instagram.com/srbotanicals9/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2f5d50] hover:text-[#24493f] transition"
            >
              <Instagram className="w-8 h-8" />
            </a>
            <a
              href="https://www.facebook.com/srbotanicals9/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2f5d50] hover:text-[#24493f] transition"
            >
              <Facebook className="w-8 h-8" />
            </a>
          </div>
        </div>
      </FadeInOnScroll>
    </section>
  );
}
