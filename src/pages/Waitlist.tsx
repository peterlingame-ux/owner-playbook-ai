import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const waitlistSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().min(1, "Phone is required").max(20, "Phone must be less than 20 characters"),
  contactMethod: z.enum(["email", "whatsapp", "telegram"], {
    required_error: "Please select a contact method",
  }),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

const Waitlist = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<WaitlistFormData>({
    name: "",
    email: "",
    phone: "",
    contactMethod: "email",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof WaitlistFormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      waitlistSchema.parse(formData);
      setErrors({});

      // Here you would typically save to database
      // For now, just show success message
      toast({
        title: "Successfully joined waitlist!",
        description: `We'll contact you via ${formData.contactMethod.toUpperCase()}`,
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        contactMethod: "email",
      });

      // Navigate back to home after 2 seconds
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof WaitlistFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof WaitlistFormData] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 md:py-16">
        <div className="max-w-full sm:max-w-3xl md:max-w-4xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl md:text-6xl font-pixel font-bold mb-3 sm:mb-4 md:mb-6 text-foreground">
            JOIN THE WAITLIST
          </h1>
          
          <p className="text-sm sm:text-base md:text-xl text-muted-foreground mb-6 sm:mb-8 md:mb-12 px-2">
            Drop your information below to get early access to Nofi models and trading tools.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 sm:gap-4 items-start justify-center">
            <div className="flex-1 w-full">
              <Input
                placeholder="NAME"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-12 sm:h-13 md:h-14 text-sm sm:text-base border-2"
              />
              {errors.name && <p className="text-destructive text-sm mt-1 text-left">{errors.name}</p>}
            </div>

            <div className="flex-1 w-full">
              <Input
                type="email"
                placeholder="EMAIL"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 sm:h-13 md:h-14 text-sm sm:text-base border-2"
              />
              {errors.email && <p className="text-destructive text-sm mt-1 text-left">{errors.email}</p>}
            </div>

            <div className="flex-1 w-full">
              <Input
                placeholder="PHONE"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-12 sm:h-13 md:h-14 text-sm sm:text-base border-2"
              />
              {errors.phone && <p className="text-destructive text-sm mt-1 text-left">{errors.phone}</p>}
            </div>

            <div className="flex-1 w-full">
              <Select
                value={formData.contactMethod}
                onValueChange={(value: "email" | "whatsapp" | "telegram") =>
                  setFormData({ ...formData, contactMethod: value })
                }
              >
                <SelectTrigger className="h-12 sm:h-13 md:h-14 text-sm sm:text-base border-2 bg-background">
                  <SelectValue placeholder="CONTACT: EMAIL" />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 z-50">
                  <SelectItem value="email">EMAIL</SelectItem>
                  <SelectItem value="whatsapp">WHATSAPP</SelectItem>
                  <SelectItem value="telegram">TELEGRAM</SelectItem>
                </SelectContent>
              </Select>
              {errors.contactMethod && <p className="text-destructive text-sm mt-1 text-left">{errors.contactMethod}</p>}
            </div>

            <Button type="submit" className="h-12 sm:h-13 md:h-14 px-6 sm:px-8 text-sm sm:text-base font-medium">
              JOIN
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Waitlist;
